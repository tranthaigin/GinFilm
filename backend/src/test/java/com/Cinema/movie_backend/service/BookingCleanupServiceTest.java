package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.entity.*;
import com.Cinema.movie_backend.enums.BookingStatus;
import com.Cinema.movie_backend.repository.*;
import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class BookingCleanupServiceTest {
    @Test void paymentCompletedWhileWaitingForLockCannotBeCancelled() {
        BookingRepository bookings = mock(BookingRepository.class); UserRepository users = mock(UserRepository.class);
        Booking stale = Booking.builder().id(1L).status(BookingStatus.PENDING).expireAt(LocalDateTime.now().minusMinutes(1)).build();
        Booking current = Booking.builder().id(1L).status(BookingStatus.COMPLETED).tickets(new ArrayList<>(List.of(new Ticket()))).build();
        when(bookings.findByStatusAndExpireAtBefore(eq(BookingStatus.PENDING), any())).thenReturn(List.of(stale));
        when(bookings.findLockedById(1L)).thenReturn(Optional.of(current));
        new BookingCleanupTask(bookings, users).cleanupExpiredBookings();
        assertEquals(BookingStatus.COMPLETED, current.getStatus()); assertEquals(1, current.getTickets().size()); verifyNoInteractions(users);
    }
    @Test void expiredPendingOrderReturnsPointsAndReleasesSeats() {
        BookingRepository bookings = mock(BookingRepository.class); UserRepository users = mock(UserRepository.class);
        User user = new User(); user.setRewardPoints(5);
        Booking booking = Booking.builder().id(1L).user(user).status(BookingStatus.PENDING).pointsUsed(10)
                .expireAt(LocalDateTime.now().minusMinutes(1)).tickets(new ArrayList<>(List.of(new Ticket()))).build();
        when(bookings.findByStatusAndExpireAtBefore(eq(BookingStatus.PENDING), any())).thenReturn(List.of(booking));
        when(bookings.findLockedById(1L)).thenReturn(Optional.of(booking));
        new BookingCleanupTask(bookings, users).cleanupExpiredBookings();
        assertEquals(BookingStatus.CANCELLED, booking.getStatus()); assertEquals(15, user.getRewardPoints());
        assertEquals(0, booking.getPointsUsed()); assertTrue(booking.getTickets().isEmpty()); verify(users).save(user);
    }
}
