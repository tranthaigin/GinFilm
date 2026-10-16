package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.entity.*;
import com.Cinema.movie_backend.enums.*;
import com.Cinema.movie_backend.repository.*;
import com.stripe.model.PaymentIntent;
import org.junit.jupiter.api.*;
import java.util.*;
import java.time.LocalDateTime;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PaymentConfirmationServiceTest {
    BookingRepository bookings = mock(BookingRepository.class);
    OnlineTicketRepository tickets = mock(OnlineTicketRepository.class);
    PaymentRepository payments = mock(PaymentRepository.class);
    UserRepository users = mock(UserRepository.class);
    StripeGateway stripe = mock(StripeGateway.class);
    VnpayService vnpay = mock(VnpayService.class);
    MemberPointService points = mock(MemberPointService.class);
    NotificationService notifications = mock(NotificationService.class);
    EmailService email = mock(EmailService.class);
    PaymentConfirmationService service = new PaymentConfirmationService(bookings, tickets, payments, users, stripe, vnpay, points, notifications, email);
    User owner;
    OnlineTicket ticket;
    PaymentIntent intent;
    @BeforeEach void setup() {
        owner = new User(); owner.setEmail("owner@example.com"); owner.setRewardPoints(0);
        ticket = OnlineTicket.builder().user(owner).ticketCode("WEB-test").price(45000.0).paymentMethod(PaymentMethod.STRIPE)
                .providerReference("pi_test").paymentStatus(PaymentStatus.PENDING).isBanned(true).build();
        when(tickets.findLockedByTicketCode("WEB-test")).thenReturn(Optional.of(ticket));
        intent = new PaymentIntent(); intent.setId("pi_test"); intent.setStatus("succeeded"); intent.setCurrency("vnd");
        intent.setAmount(45000L); intent.setAmountReceived(45000L);
        intent.setMetadata(Map.of("reference", "online:WEB-test", "owner", owner.getEmail()));
        when(stripe.retrieve("pi_test")).thenReturn(intent);
    }
    @Test void verifiedPaymentUnlocksTicket() {
        service.confirmStripe("pi_test", owner.getEmail());
        assertEquals(PaymentStatus.SUCCESS, ticket.getPaymentStatus()); assertFalse(ticket.getIsBanned());
        assertEquals(2, owner.getRewardPoints());
    }
    @Test void repeatDoesNotAwardPointsOrSendEmailAgain() {
        service.confirmStripe("pi_test", owner.getEmail()); service.confirmStripe("pi_test", owner.getEmail());
        assertEquals(2, owner.getRewardPoints()); verify(email, times(1)).sendOnlineMovieTicketEmail(any(), any(), eq(ticket));
    }
    @Test void processingDoesNotUnlockTicket() {
        intent.setStatus("processing"); assertThrows(IllegalArgumentException.class, () -> service.confirmStripe("pi_test", owner.getEmail()));
        assertTrue(ticket.getIsBanned()); verify(tickets, never()).save(any());
    }
    @Test void wrongAmountDoesNotUnlockTicket() { intent.setAmount(1L); intent.setAmountReceived(1L); assertThrows(IllegalArgumentException.class, () -> service.confirmStripe("pi_test", owner.getEmail())); }
    @Test void anotherOwnerCannotConfirm() { assertThrows(IllegalArgumentException.class, () -> service.confirmStripe("pi_test", "other@example.com")); }
    @Test void currentOwnerCanConfirmAfterChangingEmail() {
        owner.setEmail("new-owner@example.com");
        assertTrue(service.confirmStripe("pi_test", owner.getEmail()));
        assertEquals(PaymentStatus.SUCCESS, ticket.getPaymentStatus());
    }
    @Test void trustedWebhookSurvivesOwnerEmailChange() {
        owner.setEmail("new-owner@example.com");
        assertTrue(service.confirmStripeWebhook("pi_test"));
        verify(email).sendOnlineMovieTicketEmail(eq(owner.getEmail()), any(), eq(ticket));
    }
    @Test void previousEmailCannotConfirmAfterChangingEmail() {
        owner.setEmail("new-owner@example.com");
        assertThrows(IllegalArgumentException.class, () -> service.confirmStripe("pi_test", "owner@example.com"));
    }
    @Test void webhookCannotConfirmDifferentPersistedIntent() {
        ticket.setProviderReference("pi_other");
        assertThrows(IllegalArgumentException.class, () -> service.confirmStripeWebhook("pi_test"));
    }
    @Test void wrongCurrencyRejected() { intent.setCurrency("usd"); assertThrows(IllegalArgumentException.class, () -> service.confirmStripe("pi_test", owner.getEmail())); }
    @Test void invalidVnpaySignatureRejectedBeforeLookup() { assertThrows(IllegalArgumentException.class, () -> service.confirmVnpay(Map.of())); verifyNoInteractions(tickets, payments); }
    @Test void vnpayWrongAmountRejected() {
        ticket.setPaymentMethod(PaymentMethod.VNPAY);
        var fields = Map.of("vnp_TxnRef", "WEB-test", "vnp_Amount", "100", "vnp_ResponseCode", "00", "vnp_TransactionStatus", "00");
        when(vnpay.verifyCallback(fields)).thenReturn(true);
        assertThrows(IllegalArgumentException.class, () -> service.confirmVnpay(fields)); assertTrue(ticket.getIsBanned());
    }
    @Test void failedCallbackAfterSuccessDoesNotCancelPaidTicket() {
        ticket.setPaymentMethod(PaymentMethod.VNPAY);
        ticket.setPaymentStatus(PaymentStatus.SUCCESS); ticket.setIsBanned(false);
        var fields = Map.of("vnp_TxnRef", "WEB-test", "vnp_Amount", "4500000", "vnp_ResponseCode", "24", "vnp_TransactionStatus", "02");
        when(vnpay.verifyCallback(fields)).thenReturn(true); service.confirmVnpay(fields);
        assertEquals(PaymentStatus.SUCCESS, ticket.getPaymentStatus()); assertFalse(ticket.getIsBanned());
    }
    @Test void emailFailureDoesNotReverseSuccessfulPayment() {
        doThrow(new IllegalStateException("Email unavailable")).when(email).sendOnlineMovieTicketEmail(any(), any(), any());
        assertDoesNotThrow(() -> service.confirmStripe("pi_test", owner.getEmail()));
        assertEquals(PaymentStatus.SUCCESS, ticket.getPaymentStatus());
    }
    @Test void lateCinemaPaymentIsRecordedForRefundWithoutIssuingSeats() {
        Booking booking = Booking.builder().id(42L).user(owner).status(BookingStatus.CANCELLED).tickets(new ArrayList<>()).build();
        Payment payment = Payment.builder().booking(booking).amount(45000.0).method(PaymentMethod.STRIPE).status(PaymentStatus.PENDING).transactionNo("pi_test").build();
        intent.setMetadata(Map.of("reference", "booking:42", "owner", owner.getEmail()));
        when(bookings.findLockedById(42L)).thenReturn(Optional.of(booking)); when(payments.findByBooking(booking)).thenReturn(Optional.of(payment));
        service.confirmStripe("pi_test", owner.getEmail());
        assertEquals(PaymentStatus.REFUND_PENDING, payment.getStatus()); assertEquals(BookingStatus.CANCELLED, booking.getStatus());
        verify(points, never()).award(any(), any());
    }
}
