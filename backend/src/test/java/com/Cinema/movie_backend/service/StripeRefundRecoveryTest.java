package com.Cinema.movie_backend.service;

import com.stripe.model.Refund;
import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class StripeRefundRecoveryTest {
    Refund refund(long amount, String status) {
        Refund result = new Refund(); result.setId("re_prior"); result.setAmount(amount);
        result.setCurrency("vnd"); result.setPaymentIntent("pi_order"); result.setStatus(status);
        return result;
    }
    @Test void priorSucceededRefundIsRecoveredWithoutMetadata() {
        Refund prior = refund(45000, "succeeded");
        assertSame(prior, StripeGateway.recoverRefund(List.of(prior), "pi_order", 45000, "new-key"));
    }
    @Test void pendingOperationIsRecoveredAfterIdempotencyExpiry() {
        Refund prior = refund(45000, "pending"); prior.setMetadata(Map.of("operation", "order-key"));
        assertSame(prior, StripeGateway.recoverRefund(List.of(prior), "pi_order", 45000, "order-key"));
    }
    @Test void partialRefundPreventsIssuingAnotherFullRefund() {
        assertThrows(IllegalStateException.class, () -> StripeGateway.recoverRefund(List.of(refund(10000, "succeeded")), "pi_order", 45000, "order-key"));
    }
    @Test void failedRefundDoesNotBlockNewOperation() {
        assertNull(StripeGateway.recoverRefund(List.of(refund(45000, "failed")), "pi_order", 45000, "order-key"));
    }
}
