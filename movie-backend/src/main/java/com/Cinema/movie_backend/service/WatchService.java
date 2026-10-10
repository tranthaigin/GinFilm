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

    @Transactional
    public void syncWatchProgress(String email, String ticketCode, Long movieId, Integer currentPosition, Integer elapsedSeconds) {
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
            OnlineTicket ticket = onlineTicketRepository.findByTicketCode(ticketCode)
                    .orElseThrow(() -> new RuntimeException("Vé không tồn tại"));
            
            int consumed = ticket.getConsumedTimeSeconds() != null ? ticket.getConsumedTimeSeconds() : 0;
            ticket.setConsumedTimeSeconds(consumed + elapsedSeconds);
            ticket.setWatchPosition(currentPosition);
            ticket.setLastWatchedAt(LocalDateTime.now());

            // Validate constraints
            if (ticket.getExpiresAt() != null && ticket.getExpiresAt().isBefore(LocalDateTime.now())) {
                throw new RuntimeException("EXPIRED_ABSOLUTE:Mã vé này đã quá thời hạn 48 giờ sử dụng kể từ lần xem đầu tiên.");
            }
            if (ticket.getTimeLimitMinutes() != null && ticket.getConsumedTimeSeconds() >= ticket.getTimeLimitMinutes() * 60) {
                throw new RuntimeException("EXPIRED_QUOTA:Mã vé này đã sử dụng hết hạn mức thời gian xem.");
            }

            onlineTicketRepository.save(ticket);
        }
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getWatchProgress(String email, Long movieId, String ticketCode) {
        Map<String, Object> result = new java.util.HashMap<>();
        
        if (ticketCode != null && !ticketCode.isEmpty()) {
            onlineTicketRepository.findByTicketCode(ticketCode).ifPresent(ticket -> {
                result.put("position", ticket.getWatchPosition() != null ? ticket.getWatchPosition() : 0);
                result.put("consumedTimeSeconds", ticket.getConsumedTimeSeconds() != null ? ticket.getConsumedTimeSeconds() : 0);
            });
            if (result.containsKey("position")) {
                return result;
            }
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
    public OnlineTicket updatePlayStatus(String email, String ticketCode, Boolean isPlaying) {
        if (ticketCode == null || ticketCode.isEmpty()) return null;
        
        OnlineTicket ticket = onlineTicketRepository.findByTicketCode(ticketCode).orElse(null);
        if (ticket != null) {
            ticket.setIsPlaying(isPlaying);
            return onlineTicketRepository.save(ticket);
        }
        return null;
    }
}
