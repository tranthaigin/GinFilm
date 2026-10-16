package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.entity.*;
import com.Cinema.movie_backend.enums.PaymentStatus;
import com.Cinema.movie_backend.repository.OnlineTicketRepository;
import org.junit.jupiter.api.*;
import java.time.LocalDateTime;
import java.util.Optional;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class TicketAccessServiceTest {
    OnlineTicketRepository repository;
    TicketAccessService access;
    OnlineTicket ticket;
    @BeforeEach void setup() {
        repository = mock(OnlineTicketRepository.class); access = new TicketAccessService(repository);
        User viewer = new User(); viewer.setEmail("viewer@example.com");
        Movie movie = new Movie(); movie.setId(1L);
        ticket = OnlineTicket.builder().movie(movie).currentViewer(viewer).currentSessionToken("session")
                .activatedAt(LocalDateTime.now()).expiresAt(LocalDateTime.now().plusHours(1)).timeLimitMinutes(120)
                .paymentStatus(PaymentStatus.SUCCESS).isBanned(false).consumedTimeSeconds(0).build();
        when(repository.findByTicketCode("WEB-test")).thenReturn(Optional.of(ticket));
    }
    OnlineTicket require(String email, String session, Long movie) { return access.requireViewer("WEB-test", email, session, movie); }
    @Test void activatedViewerAllowed() { assertSame(ticket, require("viewer@example.com", "session", 1L)); }
    @Test void otherViewerDenied() { assertThrows(RuntimeException.class, () -> require("other@example.com", "session", 1L)); }
    @Test void previousSessionDenied() { assertThrows(RuntimeException.class, () -> require("viewer@example.com", "old", 1L)); }
    @Test void otherMovieDenied() { assertThrows(RuntimeException.class, () -> require("viewer@example.com", "session", 2L)); }
    @Test void bannedTicketDenied() { ticket.setIsBanned(true); assertThrows(RuntimeException.class, () -> require("viewer@example.com", "session", 1L)); }
    @Test void unpaidTicketDenied() { ticket.setPaymentStatus(PaymentStatus.PENDING); assertThrows(RuntimeException.class, () -> require("viewer@example.com", "session", 1L)); }
    @Test void unactivatedTicketDenied() { ticket.setActivatedAt(null); ticket.setExpiresAt(null); assertThrows(RuntimeException.class, () -> require("viewer@example.com", "session", 1L)); }
    @Test void expiredTicketDenied() { ticket.setExpiresAt(LocalDateTime.now().minusMinutes(1)); assertThrows(RuntimeException.class, () -> require("viewer@example.com", "session", 1L)); }
    @Test void exhaustedQuotaDenied() { ticket.setConsumedTimeSeconds(7200); assertThrows(RuntimeException.class, () -> require("viewer@example.com", "session", 1L)); }
}
