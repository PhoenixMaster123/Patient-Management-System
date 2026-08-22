package org.example.patientservice.mapper;

import org.example.patientservice.dto.PatientRequestDTO;
import org.example.patientservice.dto.PatientResponseDTO;
import org.example.patientservice.model.Patient;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PatientMapperTest {

    private static final UUID ID = UUID.fromString("123e4567-e89b-12d3-a456-426614174000");

    private static PatientRequestDTO request() {
        PatientRequestDTO dto = new PatientRequestDTO();
        dto.setName("Jane Smith");
        dto.setEmail("jane.smith@example.com");
        dto.setAddress("456 Elm St, Shelbyville");
        dto.setDateOfBirth("1990-09-23");
        dto.setRegisteredDate("2023-12-01");
        return dto;
    }

    private static Patient patient() {
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
    @DisplayName("toModel parses both dates and copies the rest")
    void toModelParsesDates() {
        Patient patient = PatientMapper.toModel(request());

        assertThat(patient.getName()).isEqualTo("Jane Smith");
        assertThat(patient.getEmail()).isEqualTo("jane.smith@example.com");
        assertThat(patient.getAddress()).isEqualTo("456 Elm St, Shelbyville");
        assertThat(patient.getDateOfBirth()).isEqualTo(LocalDate.of(1990, 9, 23));
        assertThat(patient.getRegisteredDate()).isEqualTo(LocalDate.of(2023, 12, 1));
    }

    @Test
    @DisplayName("toModel does not invent an id — the database assigns it")
    void toModelLeavesIdUnset() {
        assertThat(PatientMapper.toModel(request()).getId()).isNull();
    }

    @Test
    @DisplayName("toDTO renders the id and dates as strings")
    void toDtoRendersStrings() {
        PatientResponseDTO dto = PatientMapper.toDTO(patient());

        assertThat(dto.getId()).isEqualTo(ID.toString());
        assertThat(dto.getName()).isEqualTo("Jane Smith");
        assertThat(dto.getEmail()).isEqualTo("jane.smith@example.com");
        assertThat(dto.getAddress()).isEqualTo("456 Elm St, Shelbyville");
        assertThat(dto.getDateOfBirth()).isEqualTo("1990-09-23");
    }

    /**
     * PatientResponseDTO has no registeredDate field, so the value is stored but never
     * returned. The console works around this; if the field is ever added to the DTO,
     * this test should be replaced with one asserting it round-trips.
     */
    @Test
    @DisplayName("toDTO drops registeredDate, which the response DTO cannot carry")
    void toDtoDropsRegisteredDate() {
        assertThat(PatientResponseDTO.class.getDeclaredFields())
                .extracting(java.lang.reflect.Field::getName)
                .doesNotContain("registeredDate");
    }

    @Test
    @DisplayName("a non-ISO date of birth is rejected at mapping time")
    void toModelRejectsNonIsoDateOfBirth() {
        PatientRequestDTO dto = request();
        dto.setDateOfBirth("23-09-1990");

        assertThatThrownBy(() -> PatientMapper.toModel(dto))
                .isInstanceOf(DateTimeParseException.class);
    }

    @Test
    @DisplayName("a missing registeredDate fails rather than defaulting silently")
    void toModelRejectsMissingRegisteredDate() {
        PatientRequestDTO dto = request();
        dto.setRegisteredDate(null);

        assertThatThrownBy(() -> PatientMapper.toModel(dto))
                .isInstanceOf(NullPointerException.class);
    }

    @Test
    @DisplayName("a model mapped from a request survives a round trip back to a DTO")
    void roundTripsThroughBothMappers() {
        Patient patient = PatientMapper.toModel(request());
        patient.setId(ID);

        PatientResponseDTO dto = PatientMapper.toDTO(patient);

        assertThat(dto.getName()).isEqualTo(request().getName());
        assertThat(dto.getEmail()).isEqualTo(request().getEmail());
        assertThat(dto.getDateOfBirth()).isEqualTo(request().getDateOfBirth());
    }
}
