package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.entity.*;
import com.Cinema.movie_backend.repository.*;
import org.junit.jupiter.api.*;
import java.time.LocalDateTime;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class WatchRepairServiceTest {
    WatchHistoryRepository history = mock(WatchHistoryRepository.class);
    OnlineTicketRepository tickets = mock(OnlineTicketRepository.class);
    UserRepository users = mock(UserRepository.class);
    MovieRepository movies = mock(MovieRepository.class);
    TicketAccessService access = mock(TicketAccessService.class);
    WatchService service = new WatchService(history, tickets, users, movies, access);
    OnlineTicket ticket;
    @BeforeEach void setup() {
        User user = new User(); user.setId(UUID.randomUUID()); user.setEmail("viewer@example.com");
        Movie movie = new Movie(); movie.setId(1L); movie.setDuration(120);
        ticket = OnlineTicket.builder().movie(movie).user(user).consumedTimeSeconds(100).timeLimitMinutes(300)
                .isPlaying(true).lastWatchedAt(LocalDateTime.now().minusSeconds(5)).build();
        when(access.requireViewerForUpdate("WEB-test", user.getEmail(), "session", 1L)).thenReturn(ticket);
        when(tickets.findByTicketCode("WEB-test")).thenReturn(Optional.of(ticket));
        when(users.findByEmailManual(user.getEmail())).thenReturn(Optional.of(user));
        when(movies.findById(1L)).thenReturn(Optional.of(movie));
        when(history.findFirstByUserIdAndMovieIdOrderByLastWatchedAtDesc(user.getId(), 1L)).thenReturn(Optional.empty());
    }
    @Test void negativeElapsedRejectedBeforeAnyWrite() { assertThrows(IllegalArgumentException.class, () -> service.syncWatchProgress("viewer@example.com", "WEB-test", 1L, 0, -60, "session")); verifyNoInteractions(history); assertEquals(100, ticket.getConsumedTimeSeconds()); }
    @Test void largeElapsedRejected() { assertThrows(IllegalArgumentException.class, () -> service.syncWatchProgress("viewer@example.com", "WEB-test", 1L, 0, 10000, "session")); }
    @Test void elapsedBoundedByServerWallClock() { service.syncWatchProgress("viewer@example.com", "WEB-test", 1L, 30, 60, "session"); assertTrue(ticket.getConsumedTimeSeconds() >= 105 && ticket.getConsumedTimeSeconds() <= 106); }
    @Test void pausedTicketDoesNotConsumeQuota() { ticket.setIsPlaying(false); service.syncWatchProgress("viewer@example.com", "WEB-test", 1L, 30, 5, "session"); assertEquals(100, ticket.getConsumedTimeSeconds()); }
    @Test void foreignViewerStatusDenied() { when(access.requireViewerForUpdate("WEB-test", "other@example.com", "session", null)).thenThrow(new IllegalArgumentException("Access denied")); assertThrows(IllegalArgumentException.class, () -> service.updatePlayStatus("other@example.com", "WEB-test", true, "session")); verify(tickets, never()).save(any()); }
}
