package org.example.patientservice.service;

import org.example.patientservice.dto.PatientRequestDTO;
import org.example.patientservice.dto.PatientResponseDTO;
import org.example.patientservice.exception.EmailAlreadyExistsException;
import org.example.patientservice.exception.PatientNotFoundException;
import org.example.patientservice.grpc.BillingServiceGrpcClient;
import org.example.patientservice.kafka.KafkaProducer;
import org.example.patientservice.model.Patient;
import org.example.patientservice.repository.PatientRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Unit tests for the one piece of real business logic in the system: what a create
 * fans out to, and which updates are rejected. Collaborators are mocked, so these
 * run with no database, no broker and no gRPC server.
 */
@ExtendWith(MockitoExtension.class)
class PatientServiceTest {

    private static final UUID ID = UUID.fromString("123e4567-e89b-12d3-a456-426614174000");

    @Mock
    private PatientRepository patientRepository;
    @Mock
    private BillingServiceGrpcClient billingServiceGrpcClient;
    @Mock
    private KafkaProducer kafkaProducer;

    @InjectMocks
    private PatientService patientService;

    private PatientRequestDTO request;

    @BeforeEach
    void setUp() {
        request = new PatientRequestDTO();
        request.setName("Jane Smith");
        request.setEmail("jane.smith@example.com");
        request.setAddress("456 Elm St, Shelbyville");
        request.setDateOfBirth("1990-09-23");
        request.setRegisteredDate("2023-12-01");
    }

    private static Patient persisted() {
        Patient patient = new Patient();
        patient.setId(ID);
        patient.setName("Jane Smith");
        patient.setEmail("jane.smith@example.com");
        patient.setAddress("456 Elm St, Shelbyville");
        patient.setDateOfBirth(LocalDate.of(1990, 9, 23));
        patient.setRegisteredDate(LocalDate.of(2023, 12, 1));
        return patient;
    }

    @Test
    @DisplayName("getAllPatients maps every row to a DTO")
    void getAllPatientsMapsEveryRow() {
        when(patientRepository.findAll()).thenReturn(List.of(persisted()));

        List<PatientResponseDTO> patients = patientService.getAllPatients();

        assertThat(patients).singleElement().satisfies(dto -> {
            assertThat(dto.getId()).isEqualTo(ID.toString());
            assertThat(dto.getName()).isEqualTo("Jane Smith");
            assertThat(dto.getDateOfBirth()).isEqualTo("1990-09-23");
        });
    }

    @Test
    @DisplayName("getAllPatients returns empty rather than null for an empty registry")
    void getAllPatientsHandlesEmptyRegistry() {
        when(patientRepository.findAll()).thenReturn(List.of());

        assertThat(patientService.getAllPatients()).isEmpty();
    }

    @Test
    @DisplayName("createPatient writes the row, then opens billing and publishes the event")
    void createPatientFansOutToBillingAndKafka() {
        when(patientRepository.existsByEmail("jane.smith@example.com")).thenReturn(false);
        when(patientRepository.save(any(Patient.class))).thenReturn(persisted());

        PatientResponseDTO response = patientService.createPatient(request);

        assertThat(response.getId()).isEqualTo(ID.toString());

        // Billing must be given the *saved* id, not anything from the request.
        verify(billingServiceGrpcClient)
                .createBillingAccount(ID.toString(), "Jane Smith", "jane.smith@example.com");

        ArgumentCaptor<Patient> event = ArgumentCaptor.forClass(Patient.class);
        verify(kafkaProducer).sendEvent(event.capture());
        assertThat(event.getValue().getId()).isEqualTo(ID);
    }

    @Test
    @DisplayName("createPatient persists the fields it was given")
    void createPatientPersistsRequestFields() {
        when(patientRepository.existsByEmail(anyString())).thenReturn(false);
        when(patientRepository.save(any(Patient.class))).thenReturn(persisted());

        patientService.createPatient(request);

        ArgumentCaptor<Patient> saved = ArgumentCaptor.forClass(Patient.class);
        verify(patientRepository).save(saved.capture());
        assertThat(saved.getValue().getName()).isEqualTo("Jane Smith");
        assertThat(saved.getValue().getDateOfBirth()).isEqualTo(LocalDate.of(1990, 9, 23));
        assertThat(saved.getValue().getRegisteredDate()).isEqualTo(LocalDate.of(2023, 12, 1));
    }

    @Test
    @DisplayName("createPatient rejects a duplicate email before touching anything else")
    void createPatientRejectsDuplicateEmail() {
        when(patientRepository.existsByEmail("jane.smith@example.com")).thenReturn(true);

        assertThatThrownBy(() -> patientService.createPatient(request))
                .isInstanceOf(EmailAlreadyExistsException.class)
                .hasMessageContaining("jane.smith@example.com");

        verify(patientRepository, never()).save(any());
        verifyNoInteractions(billingServiceGrpcClient, kafkaProducer);
    }

    @Test
    @DisplayName("createPatient rejects a date of birth that is not an ISO date")
    void createPatientRejectsUnparsableDate() {
        when(patientRepository.existsByEmail(anyString())).thenReturn(false);
        request.setDateOfBirth("23/09/1990");

        assertThatThrownBy(() -> patientService.createPatient(request))
                .isInstanceOf(java.time.format.DateTimeParseException.class);

        verify(patientRepository, never()).save(any());
    }

    @Test
    @DisplayName("updatePatient fails when the id is unknown")
    void updatePatientRejectsUnknownId() {
        when(patientRepository.findById(ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> patientService.updatePatient(ID, request))
                .isInstanceOf(PatientNotFoundException.class)
                .hasMessageContaining(ID.toString());

        verify(patientRepository, never()).save(any());
    }

    @Test
    @DisplayName("updatePatient fails when the email belongs to a different patient")
    void updatePatientRejectsEmailOwnedByAnother() {
        when(patientRepository.findById(ID)).thenReturn(Optional.of(persisted()));
        when(patientRepository.existsByEmailAndIdNot("jane.smith@example.com", ID)).thenReturn(true);

        assertThatThrownBy(() -> patientService.updatePatient(ID, request))
                .isInstanceOf(EmailAlreadyExistsException.class);

        verify(patientRepository, never()).save(any());
    }

    @Test
    @DisplayName("updatePatient keeping its own email is allowed")
    void updatePatientMayKeepItsOwnEmail() {
        Patient existing = persisted();
        when(patientRepository.findById(ID)).thenReturn(Optional.of(existing));
        when(patientRepository.existsByEmailAndIdNot("jane.smith@example.com", ID)).thenReturn(false);
        when(patientRepository.save(existing)).thenReturn(existing);

        request.setName("Jane Smith-Jones");
        request.setAddress("789 Oak St, Capital City");

        PatientResponseDTO response = patientService.updatePatient(ID, request);

        assertThat(response.getName()).isEqualTo("Jane Smith-Jones");
        assertThat(existing.getAddress()).isEqualTo("789 Oak St, Capital City");
    }

    @Test
    @DisplayName("updatePatient does not re-open billing or re-publish an event")
    void updatePatientDoesNotFanOut() {
        Patient existing = persisted();
        when(patientRepository.findById(ID)).thenReturn(Optional.of(existing));
        when(patientRepository.existsByEmailAndIdNot(anyString(), eq(ID))).thenReturn(false);
        when(patientRepository.save(existing)).thenReturn(existing);

        patientService.updatePatient(ID, request);

        // Only creation fans out; an update is a local write.
        verifyNoInteractions(billingServiceGrpcClient, kafkaProducer);
    }

    @Test
    @DisplayName("updatePatient leaves registeredDate alone")
    void updatePatientDoesNotChangeRegisteredDate() {
        Patient existing = persisted();
        when(patientRepository.findById(ID)).thenReturn(Optional.of(existing));
        when(patientRepository.existsByEmailAndIdNot(anyString(), eq(ID))).thenReturn(false);
        when(patientRepository.save(existing)).thenReturn(existing);

        request.setRegisteredDate("2099-01-01");
        patientService.updatePatient(ID, request);

        assertThat(existing.getRegisteredDate()).isEqualTo(LocalDate.of(2023, 12, 1));
    }

    @Test
    @DisplayName("deletePatient delegates straight to the repository")
    void deletePatientDelegates() {
        patientService.deletePatient(ID);

        verify(patientRepository).deleteById(ID);
        verifyNoInteractions(billingServiceGrpcClient, kafkaProducer);
    }
}
