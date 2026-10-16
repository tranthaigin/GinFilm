package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.entity.OnlineTicket;
import com.Cinema.movie_backend.repository.OnlineTicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class TicketAccessService {
    private final OnlineTicketRepository tickets;

    public OnlineTicket requireViewer(String code, String email, String sessionId, Long movieId) {
        OnlineTicket ticket = tickets.findByTicketCode(code).orElseThrow(() -> denied("Vé không tồn tại"));
        return validateViewer(ticket, email, sessionId, movieId);
    }

    public OnlineTicket requireViewerForUpdate(String code, String email, String sessionId, Long movieId) {
        OnlineTicket ticket = tickets.findLockedByTicketCode(code).orElseThrow(() -> denied("Vé không tồn tại"));
        return validateViewer(ticket, email, sessionId, movieId);
    }

    private OnlineTicket validateViewer(OnlineTicket ticket, String email, String sessionId, Long movieId) {
        if (email == null || ticket.getCurrentViewer() == null || !email.equals(ticket.getCurrentViewer().getEmail())
                || sessionId == null || sessionId.isBlank() || !sessionId.equals(ticket.getCurrentSessionToken())) {
            throw denied("Phiên xem không hợp lệ. Vui lòng nhập PIN để mở vé.");
        }
        if (movieId != null && !movieId.equals(ticket.getMovie().getId())) throw denied("Vé không thuộc phim này");
        requireUsable(ticket);
        return ticket;
    }

    public void requireUsable(OnlineTicket ticket) {
        if (ticket.getExpiresAt() != null && !ticket.getExpiresAt().isAfter(LocalDateTime.now())) {
            throw denied("EXPIRED_ABSOLUTE:Vé đã quá thời hạn sử dụng");
        }
        if (ticket.getConsumedTimeSeconds() != null && ticket.getTimeLimitMinutes() != null
                && ticket.getConsumedTimeSeconds() >= (long) ticket.getTimeLimitMinutes() * 60) {
            throw denied("EXPIRED_QUOTA:Vé đã hết hạn mức thời gian xem");
        }
        if (ticket.getPaymentStatus() != com.Cinema.movie_backend.enums.PaymentStatus.SUCCESS
                || Boolean.TRUE.equals(ticket.getIsBanned()) || ticket.getActivatedAt() == null
                || ticket.getExpiresAt() == null || !ticket.getExpiresAt().isAfter(LocalDateTime.now())
                || ticket.getTimeLimitMinutes() == null || ticket.getTimeLimitMinutes() <= 0
                || (ticket.getConsumedTimeSeconds() != null && ticket.getConsumedTimeSeconds() >= (long) ticket.getTimeLimitMinutes() * 60)) {
            throw denied("Vé chưa thanh toán, chưa kích hoạt, bị khóa hoặc đã hết hạn");
        }
    }

    private ResponseStatusException denied(String message) { return new ResponseStatusException(HttpStatus.FORBIDDEN, message); }
}
