package com.pm.billingservice.grpc;

import billing.BillingRequest;
import billing.BillingResponse;
import io.grpc.stub.StreamObserver;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/**
 * The gRPC service has no business logic yet — it answers every request with the same
 * constants. These tests pin that contract so the day it starts doing real work, the
 * change is deliberate and visible rather than silent.
 */
@ExtendWith(MockitoExtension.class)
class BillingGrpcServiceTest {

    @Mock
    private StreamObserver<BillingResponse> responseObserver;

    private final BillingGrpcService service = new BillingGrpcService();

    private static BillingRequest request() {
        return BillingRequest.newBuilder()
                .setPatientId("123e4567-e89b-12d3-a456-426614174000")
                .setName("Jane Smith")
                .setEmail("jane.smith@example.com")
                .build();
    }

    @Test
    @DisplayName("responds with the stubbed account id and ACTIVE status")
    void respondsWithStubbedAccount() {
        service.createBillingAccount(request(), responseObserver);

        ArgumentCaptor<BillingResponse> response = ArgumentCaptor.forClass(BillingResponse.class);
        verify(responseObserver).onNext(response.capture());

        assertThat(response.getValue().getAccountId()).isEqualTo("12345");
        assertThat(response.getValue().getStatus()).isEqualTo("ACTIVE");
    }

    @Test
    @DisplayName("completes the call and never reports an error")
    void completesTheCall() {
        service.createBillingAccount(request(), responseObserver);

        inOrder(responseObserver).verify(responseObserver).onNext(org.mockito.ArgumentMatchers.any());
        verify(responseObserver).onCompleted();
        verify(responseObserver, never()).onError(org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("the response does not vary with the patient — it is still a stub")
    void responseIsIndependentOfTheRequest() {
        BillingRequest other = BillingRequest.newBuilder()
                .setPatientId("completely-different-id")
                .setName("Someone Else")
                .setEmail("someone.else@example.com")
                .build();

        service.createBillingAccount(request(), responseObserver);
        service.createBillingAccount(other, responseObserver);

        ArgumentCaptor<BillingResponse> responses = ArgumentCaptor.forClass(BillingResponse.class);
        verify(responseObserver, org.mockito.Mockito.times(2)).onNext(responses.capture());

        assertThat(responses.getAllValues())
                .extracting(BillingResponse::getAccountId)
                .containsExactly("12345", "12345");
    }
}
