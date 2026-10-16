package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.entity.NotificationType;
import com.Cinema.movie_backend.entity.WatchHistory;
import com.Cinema.movie_backend.entity.OnlineTicket;
import com.Cinema.movie_backend.repository.WatchHistoryRepository;
import com.Cinema.movie_backend.repository.OnlineTicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ReviewReminderJob {

    private final WatchHistoryRepository watchHistoryRepository;
    private final OnlineTicketRepository onlineTicketRepository;
    private final NotificationService notificationService;

    // Run every 1 minute
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void sendReviewReminders() {
        LocalDateTime timeThreshold = LocalDateTime.now().minusMinutes(10);
        List<OnlineTicket> ticketsToRemind = onlineTicketRepository.findTicketsToRemind(timeThreshold);

        for (OnlineTicket ticket : ticketsToRemind) {
            String movieTitle = ticket.getMovie().getTitle();
            
            // Validate if ticket is expired or time limit reached
            boolean isExpired = ticket.getExpiresAt() != null && ticket.getExpiresAt().isBefore(LocalDateTime.now());
            boolean isTimeLimitReached = ticket.getTimeLimitMinutes() != null && ticket.getConsumedTimeSeconds() != null && ticket.getConsumedTimeSeconds() >= ticket.getTimeLimitMinutes() * 60;
            
            // Optional: you might still want to remind them even if ticket is expired, 
            // but we can enforce that they must have some valid ticket state, or just remind anyway since they watched it.
            // For now, we remind them regardless of expiration, as long as they watched it.
            
            String link = ""; // Do not redirect or open popup when clicked
            
            notificationService.sendNotification(
                    ticket.getUser(),
                    "Đánh giá phim " + movieTitle,
                    "Bạn đã xem xong phim " + movieTitle + ". Đừng quên để lại đánh giá cảm nhận của bạn nhé!",
                    link,
                    NotificationType.SYSTEM
            );
            
            ticket.setIsReviewReminded(true);
            onlineTicketRepository.save(ticket);
        }
    }
}
