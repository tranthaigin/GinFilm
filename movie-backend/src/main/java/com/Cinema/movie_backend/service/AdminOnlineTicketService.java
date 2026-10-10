package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.entity.OnlineTicket;
import com.Cinema.movie_backend.repository.OnlineTicketRepository;
import com.Cinema.movie_backend.repository.WatchHistoryRepository;
import com.Cinema.movie_backend.entity.WatchHistory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AdminOnlineTicketService {

    private final OnlineTicketRepository onlineTicketRepository;
    private final WatchHistoryRepository watchHistoryRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;

    @Transactional(readOnly = true)
    public List<com.Cinema.movie_backend.DTO.AdminOnlineTicketDto> getAllOnlineTickets() {
        return onlineTicketRepository.findAll().stream().map(ticket -> {
            com.Cinema.movie_backend.DTO.AdminOnlineTicketDto.UserDto userDto = null;
            if (ticket.getUser() != null) {
                userDto = com.Cinema.movie_backend.DTO.AdminOnlineTicketDto.UserDto.builder()
                        .id(ticket.getUser().getId().toString())
                        .fullName(ticket.getUser().getFullName())
                        .email(ticket.getUser().getEmail())
                        .build();
            }

            com.Cinema.movie_backend.DTO.AdminOnlineTicketDto.UserDto viewerDto = null;
            if (ticket.getCurrentViewer() != null) {
                viewerDto = com.Cinema.movie_backend.DTO.AdminOnlineTicketDto.UserDto.builder()
                        .id(ticket.getCurrentViewer().getId().toString())
                        .fullName(ticket.getCurrentViewer().getFullName())
                        .email(ticket.getCurrentViewer().getEmail())
                        .build();
            }

            com.Cinema.movie_backend.DTO.AdminOnlineTicketDto.MovieDto movieDto = null;
            if (ticket.getMovie() != null) {
                movieDto = com.Cinema.movie_backend.DTO.AdminOnlineTicketDto.MovieDto.builder()
                        .id(ticket.getMovie().getId())
                        .title(ticket.getMovie().getTitle())
                        .posterUrl(ticket.getMovie().getPosterUrl())
                        .build();
            }

            Integer currentWatchPosition = 0;
            if (ticket.getUser() != null && ticket.getMovie() != null) {
                currentWatchPosition = watchHistoryRepository.findFirstByUserIdAndMovieIdOrderByLastWatchedAtDesc(ticket.getUser().getId(), ticket.getMovie().getId())
                    .map(WatchHistory::getPosition).orElse(0);
            }

            return com.Cinema.movie_backend.DTO.AdminOnlineTicketDto.builder()
                    .id(ticket.getId())
                    .ticketCode(ticket.getTicketCode())
                    .price(ticket.getPrice())
                    .purchaseTime(ticket.getPurchaseTime())
                    .activatedAt(ticket.getActivatedAt())
                    .expiresAt(ticket.getExpiresAt())
                    .timeLimitMinutes(ticket.getTimeLimitMinutes())
                    .consumedTimeSeconds(ticket.getConsumedTimeSeconds())
                    .isBanned(ticket.getIsBanned())
                    .currentSessionToken(ticket.getCurrentSessionToken())
                    .ipAddress(ticket.getIpAddress())
                    .isPlaying(ticket.getIsPlaying())
                    .watchPosition(currentWatchPosition)
                    .user(userDto)
                    .currentViewer(viewerDto)
                    .movie(movieDto)
                    .build();
        }).toList();
    }

    @Transactional
    public void banTicket(Long ticketId, boolean isBanned) {
        OnlineTicket ticket = onlineTicketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy mã vé"));
        ticket.setIsBanned(isBanned);
        if (isBanned) {
            ticket.setCurrentSessionToken(null);
        }
        onlineTicketRepository.save(ticket);
        
        // Gửi thông báo
        if (ticket.getUser() != null) {
            String status = isBanned ? "khóa" : "mở khóa";
            String title = isBanned ? "Vé xem phim trực tuyến đã bị khóa" : "Vé xem phim trực tuyến đã được mở khóa";
            String message = "Vé xem phim " + (ticket.getMovie() != null ? ticket.getMovie().getTitle() : "") + " của bạn đã bị " + status + " bởi quản trị viên.";
            
            notificationService.sendNotification(ticket.getUser(), title, message, "/my-tickets", com.Cinema.movie_backend.entity.NotificationType.WARNING);
            
            try {
                emailService.sendSystemEmail(ticket.getUser().getEmail(), ticket.getUser().getFullName(), title, message);
            } catch (Exception e) {
                // log error if needed
            }
        }
    }

    @Transactional
    public void updateTicketDuration(Long ticketId, Integer timeLimitMinutes) {
        OnlineTicket ticket = onlineTicketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy mã vé"));
        
        ticket.setTimeLimitMinutes(timeLimitMinutes);
        
        // Nếu vé đã được kích hoạt, cần tính toán lại expires_at
        if (ticket.getActivatedAt() != null) {
            ticket.setExpiresAt(ticket.getActivatedAt().plusMinutes(timeLimitMinutes));
        }
        
        onlineTicketRepository.save(ticket);
    }

    @Transactional
    public void resetTicket(Long ticketId) {
        OnlineTicket ticket = onlineTicketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy mã vé"));
        ticket.setActivatedAt(null);
        ticket.setExpiresAt(null);
        ticket.setCurrentSessionToken(null);
        ticket.setCurrentViewer(null);
        ticket.setConsumedTimeSeconds(0);
        ticket.setWatchPosition(0);
        ticket.setIsPlaying(false);
        onlineTicketRepository.save(ticket);
        
        // Reset luôn lịch sử xem của user đối với phim này về 0
        if (ticket.getUser() != null && ticket.getMovie() != null) {
            Optional<WatchHistory> historyOpt = watchHistoryRepository.findFirstByUserIdAndMovieIdOrderByLastWatchedAtDesc(
                ticket.getUser().getId(), 
                ticket.getMovie().getId()
            );
            if (historyOpt.isPresent()) {
                WatchHistory history = historyOpt.get();
                history.setPosition(0);
                watchHistoryRepository.save(history);
            }
        }
        
        // Gửi thông báo
        if (ticket.getUser() != null) {
            String title = "Vé xem phim trực tuyến đã được thiết lập lại";
            String message = "Vé xem phim " + (ticket.getMovie() != null ? ticket.getMovie().getTitle() : "") + " của bạn đã được quản trị viên thiết lập lại trạng thái chưa kích hoạt. Bạn có thể sử dụng lại mã vé này.";
            
            notificationService.sendNotification(ticket.getUser(), title, message, "/my-tickets", com.Cinema.movie_backend.entity.NotificationType.SYSTEM);
            
            try {
                emailService.sendSystemEmail(ticket.getUser().getEmail(), ticket.getUser().getFullName(), title, message);
            } catch (Exception e) {
                // log error if needed
            }
        }
    }

    public Map<String, Object> getRevenueStats() {
        Double totalRevenue = onlineTicketRepository.getTotalRevenue();
        if (totalRevenue == null) totalRevenue = 0.0;

        List<Object[]> dailyStats = onlineTicketRepository.getDailyRevenueStats();
        List<Map<String, Object>> chartData = new ArrayList<>();
        for (Object[] row : dailyStats) {
            Map<String, Object> point = new HashMap<>();
            point.put("date", row[0] != null ? row[0].toString() : "");
            point.put("revenue", row[1] != null ? ((Number) row[1]).doubleValue() : 0.0);
            point.put("ticketsSold", row[2] != null ? ((Number) row[2]).longValue() : 0L);
            chartData.add(point);
        }

        List<Object[]> movieStats = onlineTicketRepository.getRevenueByMovieStats();
        List<Map<String, Object>> byMovieData = new ArrayList<>();
        for (Object[] row : movieStats) {
            Map<String, Object> item = new HashMap<>();
            item.put("movieTitle", row[0] != null ? row[0].toString() : "Unknown");
            item.put("revenue", row[1] != null ? ((Number) row[1]).doubleValue() : 0.0);
            item.put("ticketsSold", row[2] != null ? ((Number) row[2]).longValue() : 0L);
            byMovieData.add(item);
        }

        return Map.of(
            "totalRevenue", totalRevenue,
            "chartData", chartData,
            "byMovieData", byMovieData
        );
    }
}
