package com.pm.analyticsservice.kafka;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import patient.events.PatientEvent;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * The consumer's real contract is that it never lets an exception escape: a poison
 * message must not take the listener container down or block the partition. These
 * tests deserialize directly, with no broker involved.
 */
class KafkaConsumerTest {

    private final KafkaConsumer consumer = new KafkaConsumer();

    private static byte[] validEvent() {
        return PatientEvent.newBuilder()
                .setPatientId("123e4567-e89b-12d3-a456-426614174000")
                .setName("Jane Smith")
                .setEmail("jane.smith@example.com")
                .setEventType("PATIENT_CREATED")
                .build()
                .toByteArray();
    }

    @Test
    @DisplayName("a well-formed PatientEvent is consumed without error")
    void consumesValidEvent() {
        assertThatCode(() -> consumer.consumeEvent(validEvent())).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("an unparsable payload is swallowed, not rethrown")
    void swallowsUnparsablePayload() {
        byte[] malformed = {(byte) 0xFF, (byte) 0xFF, (byte) 0xFF, (byte) 0xFF};

        assertThatCode(() -> consumer.consumeEvent(malformed)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("a plain-text payload is swallowed, not rethrown")
    void swallowsTextPayload() {
        byte[] text = "this is not protobuf".getBytes(StandardCharsets.UTF_8);

        assertThatCode(() -> consumer.consumeEvent(text)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("an empty payload is swallowed, not rethrown")
    void swallowsEmptyPayload() {
        assertThatCode(() -> consumer.consumeEvent(new byte[0])).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("an event missing optional fields still parses")
    void consumesEventWithMissingFields() {
        byte[] sparse = PatientEvent.newBuilder().setPatientId("only-an-id").build().toByteArray();

        assertThatCode(() -> consumer.consumeEvent(sparse)).doesNotThrowAnyException();
    }
}
