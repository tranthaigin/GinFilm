package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.enums.PaymentStatus;
import com.Cinema.movie_backend.repository.OnlineTicketRepository;
import com.Cinema.movie_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class PendingOnlinePaymentCleanupService {
    private final OnlineTicketRepository tickets;
    private final UserRepository users;

    @Scheduled(fixedDelay = 60000, initialDelay = 60000)
    @Transactional
    public void releaseExpiredPayments() {
        for (var candidate : tickets.findByPaymentStatusAndPurchaseTimeBefore(PaymentStatus.PENDING, LocalDateTime.now().minusMinutes(15))) {
            var ticket = tickets.findLockedByTicketCode(candidate.getTicketCode()).orElseThrow();
            if (ticket.getPaymentStatus() != PaymentStatus.PENDING) continue;
            if (ticket.getPointsUsed() != null && ticket.getPointsUsed() > 0) {
                var owner = ticket.getUser();
                owner.setRewardPoints((owner.getRewardPoints() == null ? 0 : owner.getRewardPoints()) + ticket.getPointsUsed());
                users.save(owner);
                ticket.setPointsUsed(0);
            }
            ticket.setPaymentStatus(PaymentStatus.FAILED);
            tickets.save(ticket);
        }
    }
}
