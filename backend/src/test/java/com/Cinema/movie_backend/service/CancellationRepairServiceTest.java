package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.entity.*;
import com.Cinema.movie_backend.enums.*;
import com.Cinema.movie_backend.repository.*;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class CancellationRepairServiceTest {
    @Test void cancellationRestoresPointsReleasesSeatsAndRecordsRefund() {
        BookingRepository bookings = mock(BookingRepository.class);
        UserRepository users = mock(UserRepository.class);
        PaymentRepository payments = mock(PaymentRepository.class);
        TicketCancellationService service = new TicketCancellationService(bookings, users, mock(NotificationService.class), mock(EmailService.class), mock(MemberPointService.class), payments);
        User owner = new User(); owner.setEmail("owner@example.com"); owner.setRewardPoints(3);
        Movie movie = new Movie(); movie.setTitle("Test"); Showtime show = new Showtime(); show.setMovie(movie);
        Booking booking = Booking.builder().id(42L).user(owner).showtime(show).status(BookingStatus.COMPLETED).pointsUsed(10).pointsEarned(2)
                .tickets(new ArrayList<>(List.of(new Ticket()))).build();
        Payment payment = Payment.builder().booking(booking).status(PaymentStatus.SUCCESS).build();
        when(bookings.findFutureBookingsBySeatIds(List.of(1L))).thenReturn(List.of(booking));
        when(bookings.findLockedById(42L)).thenReturn(Optional.of(booking));
        when(payments.findByBooking(booking)).thenReturn(Optional.of(payment));
        service.cancelAndRefundBookings(List.of(1L));
        assertEquals(11, owner.getRewardPoints()); assertEquals(0, booking.getPointsUsed()); assertEquals(0, booking.getPointsEarned());
        assertTrue(booking.getTickets().isEmpty()); assertEquals(BookingStatus.CANCELLED, booking.getStatus());
        assertEquals(PaymentStatus.REFUND_PENDING, payment.getStatus());
    }
}
