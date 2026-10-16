package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.entity.*;
import com.Cinema.movie_backend.enums.*;
import com.Cinema.movie_backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class RefundService {
    private final PaymentRepository payments;
    private final BookingRepository bookings;
    private final OnlineTicketRepository tickets;
    private final StripeGateway stripe;

    public record RefundOrder(String kind, Long id, String reference, String customer,
                              Double amount, PaymentMethod method, PaymentStatus status) {}

    @Transactional(readOnly = true)
    public List<RefundOrder> pending() {
        List<RefundOrder> result = new ArrayList<>();
        for (Payment payment : payments.findByStatus(PaymentStatus.REFUND_PENDING)) {
            result.add(new RefundOrder("cinema", payment.getId(), "TK" + payment.getBooking().getId(),
                    payment.getBooking().getUser().getEmail(), payment.getAmount(), payment.getMethod(), payment.getStatus()));
        }
        for (OnlineTicket ticket : tickets.findByPaymentStatus(PaymentStatus.REFUND_PENDING)) {
            result.add(new RefundOrder("online", ticket.getId(), ticket.getTicketCode(),
                    ticket.getUser().getEmail(), ticket.getPrice(), ticket.getPaymentMethod(), ticket.getPaymentStatus()));
        }
        return result;
    }

    @Transactional
    public RefundOrder process(String kind, Long id, String receipt, String adminEmail) {
        if ("cinema".equals(kind)) {
            Payment candidate = payments.findById(id).orElseThrow();
            Booking booking = bookings.findLockedById(candidate.getBooking().getId()).orElseThrow();
            Payment payment = payments.findByBooking(booking).orElseThrow();
            if (!payment.getId().equals(id)) throw new IllegalArgumentException("Sai giao dịch cần hoàn");
            if (payment.getStatus() != PaymentStatus.REFUNDED) {
                requirePending(payment.getStatus());
                var result = refund(payment.getMethod(), payment.getTransactionNo(), payment.getAmount(), "cinema-" + id, receipt, payment.getRefundReference());
                payment.setRefundReference(result.reference());
                if (result.complete()) {
                    payment.setStatus(PaymentStatus.REFUNDED);
                    payment.setRefundedAt(LocalDateTime.now());
                    payment.setRefundedBy(adminEmail);
                }
                payments.save(payment);
            }
            return new RefundOrder(kind, id, "TK" + booking.getId(), booking.getUser().getEmail(), payment.getAmount(), payment.getMethod(), payment.getStatus());
        }
        if (!"online".equals(kind)) throw new IllegalArgumentException("Loại giao dịch không hợp lệ");
        OnlineTicket candidate = tickets.findById(id).orElseThrow();
        OnlineTicket ticket = tickets.findLockedByTicketCode(candidate.getTicketCode()).orElseThrow();
        if (ticket.getPaymentStatus() != PaymentStatus.REFUNDED) {
            requirePending(ticket.getPaymentStatus());
            var result = refund(ticket.getPaymentMethod(), ticket.getProviderReference(), ticket.getPrice(), "online-" + id, receipt, ticket.getRefundReference());
            ticket.setRefundReference(result.reference());
            if (result.complete()) {
                ticket.setPaymentStatus(PaymentStatus.REFUNDED);
                ticket.setRefundedAt(LocalDateTime.now());
                ticket.setRefundedBy(adminEmail);
            }
            tickets.save(ticket);
        }
        return new RefundOrder(kind, id, ticket.getTicketCode(), ticket.getUser().getEmail(), ticket.getPrice(), ticket.getPaymentMethod(), ticket.getPaymentStatus());
    }

    private void requirePending(PaymentStatus status) {
        if (status != PaymentStatus.REFUND_PENDING) throw new IllegalArgumentException("Giao dịch không chờ hoàn tiền");
    }

    private record RefundResult(String reference, boolean complete) {}

    private RefundResult refund(PaymentMethod method, String providerId, Double amount, String operation, String receipt, String existingReference) {
        if (amount == null || !Double.isFinite(amount) || amount <= 0 || amount != Math.rint(amount)) {
            throw new IllegalArgumentException("Số tiền hoàn không hợp lệ");
        }
        if (method == PaymentMethod.STRIPE) {
            if (providerId == null || !providerId.startsWith("pi_")) throw new IllegalArgumentException("Thiếu mã thanh toán Stripe");
            var refund = existingReference == null || existingReference.isBlank()
                    ? stripe.refund(providerId, amount.longValue(), "ginfilm-refund-" + operation)
                    : stripe.retrieveRefund(existingReference);
            if (!Long.valueOf(amount.longValue()).equals(refund.getAmount())
                    || !"vnd".equals(refund.getCurrency()) || !providerId.equals(refund.getPaymentIntent())
                    || refund.getId() == null) {
                throw new IllegalStateException("Stripe chưa xác nhận hoàn tiền; giao dịch vẫn chờ xử lý");
            }
            if ("failed".equals(refund.getStatus()) || "canceled".equals(refund.getStatus())) {
                throw new IllegalStateException("Khoản hoàn tiền Stripe thất bại; cần đối soát giao dịch trước khi thử lại");
            }
            return new RefundResult(refund.getId(), "succeeded".equals(refund.getStatus()));
        }
        if (method != PaymentMethod.VNPAY && method != PaymentMethod.CASH) {
            throw new IllegalArgumentException("Chưa xác định phương thức hoàn tiền");
        }
        if (receipt == null || receipt.isBlank() || receipt.trim().length() > 255) {
            throw new IllegalArgumentException("Nhập mã chứng từ của khoản tiền đã hoàn cho khách");
        }
        return new RefundResult(receipt.trim(), true);
    }
}
