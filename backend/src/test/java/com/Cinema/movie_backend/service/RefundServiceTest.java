package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.entity.*;
import com.Cinema.movie_backend.enums.*;
import com.Cinema.movie_backend.repository.*;
import com.stripe.model.Refund;
import org.junit.jupiter.api.*;
import java.util.Optional;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class RefundServiceTest {
    PaymentRepository payments = mock(PaymentRepository.class);
    BookingRepository bookings = mock(BookingRepository.class);
    OnlineTicketRepository tickets = mock(OnlineTicketRepository.class);
    StripeGateway stripe = mock(StripeGateway.class);
    RefundService service = new RefundService(payments, bookings, tickets, stripe);
    Payment payment;
    Refund refund;

    @BeforeEach void setup() {
        User user = new User(); user.setEmail("customer@example.com");
        Booking booking = Booking.builder().id(1L).user(user).build();
        payment = Payment.builder().id(2L).booking(booking).amount(45000.0).method(PaymentMethod.STRIPE)
                .status(PaymentStatus.REFUND_PENDING).transactionNo("pi_test").build();
        when(payments.findById(2L)).thenReturn(Optional.of(payment));
        when(bookings.findLockedById(1L)).thenReturn(Optional.of(booking));
        when(payments.findByBooking(booking)).thenReturn(Optional.of(payment));
        refund = new Refund(); refund.setId("re_test"); refund.setStatus("succeeded"); refund.setAmount(45000L);
        refund.setCurrency("vnd"); refund.setPaymentIntent("pi_test");
        when(stripe.refund("pi_test", 45000L, "ginfilm-refund-cinema-2")).thenReturn(refund);
    }
    @Test void confirmedRefundRecordsOperatorAndReceipt() {
        service.process("cinema", 2L, null, "admin@example.com");
        assertEquals(PaymentStatus.REFUNDED, payment.getStatus());
        assertEquals("re_test", payment.getRefundReference()); assertEquals("admin@example.com", payment.getRefundedBy());
        assertNotNull(payment.getRefundedAt());
    }
    @Test void repeatCannotRefundTwice() {
        service.process("cinema", 2L, null, "admin@example.com"); service.process("cinema", 2L, null, "admin@example.com");
        verify(stripe, times(1)).refund(anyString(), anyLong(), anyString());
    }
    @Test void pendingProviderRefundRemainsPending() {
        refund.setStatus("pending");
        service.process("cinema", 2L, null, "admin@example.com");
        assertEquals(PaymentStatus.REFUND_PENDING, payment.getStatus()); verify(payments).save(payment);
        assertEquals("re_test", payment.getRefundReference()); assertNull(payment.getRefundedAt());
        when(stripe.retrieveRefund("re_test")).thenReturn(refund);
        refund.setStatus("succeeded");
        service.process("cinema", 2L, null, "admin@example.com");
        assertEquals(PaymentStatus.REFUNDED, payment.getStatus());
        verify(stripe, times(1)).refund(anyString(), anyLong(), anyString());
        verify(stripe).retrieveRefund("re_test");
    }
    @Test void mismatchedProviderAmountCannotMarkRefunded() {
        refund.setAmount(1L); assertThrows(IllegalStateException.class, () -> service.process("cinema", 2L, null, "admin@example.com"));
    }
    @Test void unpaidOrderCannotBeRefunded() {
        payment.setStatus(PaymentStatus.PENDING);
        assertThrows(IllegalArgumentException.class, () -> service.process("cinema", 2L, null, "admin@example.com")); verifyNoInteractions(stripe);
    }
    @Test void manualRefundNeedsProofOfActualRefund() {
        payment.setMethod(PaymentMethod.VNPAY);
        assertThrows(IllegalArgumentException.class, () -> service.process("cinema", 2L, " ", "admin@example.com"));
        service.process("cinema", 2L, "BANK-REFUND-123", "admin@example.com");
        assertEquals(PaymentStatus.REFUNDED, payment.getStatus()); assertEquals("BANK-REFUND-123", payment.getRefundReference()); verifyNoInteractions(stripe);
    }
    @Test void onlineRefundUsesStoredProviderTransaction() {
        User user = new User(); user.setEmail("customer@example.com");
        OnlineTicket ticket = OnlineTicket.builder().id(5L).ticketCode("WEB-test").user(user).price(45000.0)
                .paymentStatus(PaymentStatus.REFUND_PENDING).paymentMethod(PaymentMethod.STRIPE).providerReference("pi_test").build();
        when(tickets.findById(5L)).thenReturn(Optional.of(ticket)); when(tickets.findLockedByTicketCode("WEB-test")).thenReturn(Optional.of(ticket));
        when(stripe.refund("pi_test", 45000L, "ginfilm-refund-online-5")).thenReturn(refund);
        service.process("online", 5L, null, "admin@example.com");
        assertEquals(PaymentStatus.REFUNDED, ticket.getPaymentStatus()); assertEquals("re_test", ticket.getRefundReference());
    }
}
