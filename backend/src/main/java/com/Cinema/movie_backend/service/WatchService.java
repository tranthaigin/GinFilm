package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.entity.OnlineTicket;
import com.Cinema.movie_backend.entity.User;
import com.Cinema.movie_backend.entity.WatchHistory;
import com.Cinema.movie_backend.repository.MovieRepository;
import com.Cinema.movie_backend.repository.OnlineTicketRepository;
import com.Cinema.movie_backend.repository.UserRepository;
import com.Cinema.movie_backend.repository.WatchHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class WatchService {

    private final WatchHistoryRepository watchHistoryRepository;
    private final OnlineTicketRepository onlineTicketRepository;
    private final UserRepository userRepository;
    private final MovieRepository movieRepository;
    private final TicketAccessService ticketAccessService;

    @Transactional
    public void syncWatchProgress(String email, String ticketCode, Long movieId, Integer currentPosition, Integer elapsedSeconds, String sessionId) {
        if (currentPosition == null || currentPosition < 0 || elapsedSeconds == null || elapsedSeconds < 0 || elapsedSeconds > 60) {
            throw new IllegalArgumentException("Invalid viewing progress");
        }
        OnlineTicket viewingTicket = ticketAccessService.requireViewerForUpdate(ticketCode, email, sessionId, movieId);
        int duration = viewingTicket.getMovie().getDuration() != null ? viewingTicket.getMovie().getDuration() : 120;
        if (currentPosition > (long) duration * 60) throw new IllegalArgumentException("Position exceeds movie duration");
        LocalDateTime now = LocalDateTime.now();
        int serverElapsed = viewingTicket.getLastWatchedAt() == null ? 0
                : (int) Math.min(60, Math.max(0, java.time.Duration.between(viewingTicket.getLastWatchedAt(), now).getSeconds()));
        int acceptedElapsed = Boolean.TRUE.equals(viewingTicket.getIsPlaying()) ? serverElapsed : 0;
        User user = userRepository.findByEmailManual(email)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));

        // 1. Update Watch History
        WatchHistory history = watchHistoryRepository.findFirstByUserIdAndMovieIdOrderByLastWatchedAtDesc(user.getId(), movieId)
                .orElse(WatchHistory.builder()
                        .user(user)
                        .movie(movieRepository.findById(movieId).orElseThrow(() -> new RuntimeException("Phim không tồn tại")))
                        .build());

        history.setPosition(currentPosition);
        history.setLastWatchedAt(LocalDateTime.now());
        watchHistoryRepository.save(history);

        // 2. Update Ticket Consumed Time
        if (ticketCode != null && !ticketCode.isEmpty()) {
            OnlineTicket ticket = viewingTicket;

            int consumed = ticket.getConsumedTimeSeconds() != null ? ticket.getConsumedTimeSeconds() : 0;
            ticket.setConsumedTimeSeconds((int) Math.min((long) ticket.getTimeLimitMinutes() * 60, (long) consumed + acceptedElapsed));
            ticket.setWatchPosition(currentPosition);
            ticket.setLastWatchedAt(Boolean.TRUE.equals(ticket.getIsPlaying()) && ticket.getLastWatchedAt() != null
                    ? ticket.getLastWatchedAt().plusSeconds(acceptedElapsed) : now);

            onlineTicketRepository.save(ticket);
        }
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getWatchProgress(String email, Long movieId, String ticketCode, String sessionId) {
        Map<String, Object> result = new java.util.HashMap<>();

        if (ticketCode != null && !ticketCode.isEmpty()) {
            OnlineTicket ticket = ticketAccessService.requireViewer(ticketCode, email, sessionId, movieId);
            result.put("position", ticket.getWatchPosition() != null ? ticket.getWatchPosition() : 0);
            result.put("consumedTimeSeconds", ticket.getConsumedTimeSeconds() != null ? ticket.getConsumedTimeSeconds() : 0);
            return result;
        }

        User user = userRepository.findByEmailManual(email)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));

        Integer pos = watchHistoryRepository.findFirstByUserIdAndMovieIdOrderByLastWatchedAtDesc(user.getId(), movieId)
                .map(WatchHistory::getPosition)
                .orElse(0);

        result.put("position", pos);
        result.put("consumedTimeSeconds", 0);
        return result;
    }

    @Transactional
    public OnlineTicket updatePlayStatus(String email, String ticketCode, Boolean isPlaying, String sessionId) {
        if (ticketCode == null || ticketCode.isEmpty()) return null;

        OnlineTicket ticket = ticketAccessService.requireViewerForUpdate(ticketCode, email, sessionId, null);
        if (ticket != null) {
            if (!java.util.Objects.equals(ticket.getIsPlaying(), isPlaying)) {
                ticket.setIsPlaying(isPlaying);
                ticket.setLastWatchedAt(LocalDateTime.now());
            }
            return onlineTicketRepository.save(ticket);
        }
        return null;
    }
}
