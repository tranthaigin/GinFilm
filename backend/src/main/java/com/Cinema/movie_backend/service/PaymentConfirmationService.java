package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.entity.*;
import com.Cinema.movie_backend.enums.*;
import com.Cinema.movie_backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PaymentConfirmationService {
    private final BookingRepository bookings;
    private final OnlineTicketRepository tickets;
    private final PaymentRepository payments;
    private final UserRepository users;
    private final StripeGateway stripe;
    private final VnpayService vnpay;
    private final MemberPointService memberPoints;
    private final NotificationService notifications;
    private final EmailService emails;
    @org.springframework.beans.factory.annotation.Autowired private AfterCommitService deliveries;

    @Transactional
    public boolean confirmStripe(String intentId, String email) {
        if (email == null || email.isBlank()) throw new IllegalArgumentException("Thiếu tài khoản xác nhận");
        return verifyStripeOrder(intentId, email);
    }

    /** Called only after Stripe's webhook signature has been verified. */
    @Transactional
    public boolean confirmStripeWebhook(String intentId) {
        return verifyStripeOrder(intentId, null);
    }

    private boolean verifyStripeOrder(String intentId, String email) {
        var intent = stripe.retrieve(intentId);
        if (!"succeeded".equals(intent.getStatus()) || !"vnd".equals(intent.getCurrency())
                || intent.getMetadata() == null
                || intent.getAmount() == null || !intent.getAmount().equals(intent.getAmountReceived())) {
            throw new IllegalArgumentException("Giao dịch Stripe chưa được xác nhận hoặc không thuộc tài khoản này");
        }
        String reference = intent.getMetadata().get("reference");
        if (reference == null) throw new IllegalArgumentException("Thiếu định danh đơn hàng");
        if (reference.startsWith("online:")) {
            OnlineTicket ticket = tickets.findLockedByTicketCode(reference.substring(7)).orElseThrow();
            if ((email != null && !email.equals(ticket.getUser().getEmail())) || ticket.getPaymentMethod() != PaymentMethod.STRIPE
                    || !intentId.equals(ticket.getProviderReference())) throw new IllegalArgumentException("Sai giao dịch của vé");
            checkAmount(ticket.getPrice(), intent.getAmount(), 1);
            return completeOnline(ticket);
        } else if (reference.startsWith("booking:")) {
            Booking booking = bookings.findLockedById(Long.valueOf(reference.substring(8))).orElseThrow();
            Payment payment = payments.findByBooking(booking).orElseThrow();
            if ((email != null && !email.equals(booking.getUser().getEmail())) || payment.getMethod() != PaymentMethod.STRIPE
                    || !intentId.equals(payment.getTransactionNo())) throw new IllegalArgumentException("Sai giao dịch của đơn hàng");
            checkAmount(payment.getAmount(), intent.getAmount(), 1);
            return completeBooking(payment);
        } else throw new IllegalArgumentException("Định danh đơn hàng không hợp lệ");
    }

    @Transactional
    public boolean confirmVnpay(Map<String, String> fields) {
        if (!vnpay.verifyCallback(fields)) throw new IllegalArgumentException("Chữ ký VNPAY không hợp lệ");
        String reference = fields.get("vnp_TxnRef");
        long amount = Long.parseLong(fields.get("vnp_Amount"));
        boolean success = "00".equals(fields.get("vnp_ResponseCode")) && "00".equals(fields.get("vnp_TransactionStatus"));
        if (reference != null && reference.startsWith("WEB-")) {
            OnlineTicket ticket = tickets.findLockedByTicketCode(reference).orElseThrow();
            if (ticket.getPaymentMethod() != PaymentMethod.VNPAY) throw new IllegalArgumentException("Sai giao dịch VNPAY");
            checkAmount(ticket.getPrice(), amount, 100);
            if (success) return completeOnline(ticket);
            else if (ticket.getPaymentStatus() == PaymentStatus.PENDING) {
                restorePoints(ticket.getUser(), ticket.getPointsUsed());
                ticket.setPointsUsed(0);
                ticket.setPaymentStatus(PaymentStatus.FAILED);
                tickets.save(ticket);
            }
        } else {
            Payment candidate = payments.findByTransactionNo(reference).orElseThrow();
            Booking booking = bookings.findLockedById(candidate.getBooking().getId()).orElseThrow();
            Payment payment = payments.findByBooking(booking).orElseThrow();
            if (!reference.equals(payment.getTransactionNo()) || payment.getMethod() != PaymentMethod.VNPAY) throw new IllegalArgumentException("Sai giao dịch VNPAY");
            checkAmount(payment.getAmount(), amount, 100);
            if (success) return completeBooking(payment);
            else if (payment.getStatus() == PaymentStatus.PENDING && booking.getStatus() == BookingStatus.PENDING) {
                restorePoints(booking.getUser(), booking.getPointsUsed());
                booking.setPointsUsed(0);
                booking.setStatus(BookingStatus.CANCELLED);
                booking.getTickets().clear();
                payment.setStatus(PaymentStatus.FAILED);
                payments.save(payment);
                bookings.save(booking);
            }
        }
        return success;
    }

    private void checkAmount(Double expected, long received, int multiplier) {
        if (expected == null || !Double.isFinite(expected) || expected <= 0
                || expected != Math.rint(expected) || Math.multiplyExact(expected.longValue(), multiplier) != received) {
            throw new IllegalArgumentException("Số tiền thanh toán không khớp đơn hàng");
        }
    }

    private boolean completeOnline(OnlineTicket ticket) {
        if (ticket.getPaymentStatus() == PaymentStatus.SUCCESS) return true;
        if (ticket.getPaymentStatus() == PaymentStatus.REFUND_PENDING || ticket.getPaymentStatus() == PaymentStatus.REFUNDED) return false;
        if (ticket.getPaymentStatus() == PaymentStatus.FAILED) {
            ticket.setPaymentStatus(PaymentStatus.REFUND_PENDING);
            tickets.save(ticket);
            afterCommit(() -> notifications.sendSystemNotificationToAdmins("Cần hoàn tiền", ticket.getTicketCode(), "/admin/refunds", NotificationType.TRANSACTION));
            return false;
        }
        if (ticket.getPaymentStatus() != PaymentStatus.PENDING) throw new IllegalArgumentException("Vé không còn chờ thanh toán");
        ticket.setPaymentStatus(PaymentStatus.SUCCESS);
        ticket.setIsBanned(false);
        User user = ticket.getUser();
        int reward = (ticket.getPointsUsed() == null || ticket.getPointsUsed() == 0)
                && (ticket.getPromotionCode() == null || ticket.getPromotionCode().isBlank()) ? (int) (ticket.getPrice() / 20000) : 0;
        ticket.setPointsEarned(reward);
        ticket.setMemberPointsEarned(memberPoints.award(user, ticket.getPrice()));
        user.setRewardPoints((user.getRewardPoints() == null ? 0 : user.getRewardPoints()) + reward);
        users.save(user);
        tickets.save(ticket);
        afterCommit(() -> {
        notifications.sendNotification(user, "Thanh toán vé trực tuyến thành công!", "Mã vé: " + ticket.getTicketCode(),
                "/my-tickets", NotificationType.TRANSACTION);
        });
        afterCommit(() -> emails.sendOnlineMovieTicketEmail(user.getEmail(), user.getFullName(), ticket));
        return true;
    }

    private boolean completeBooking(Payment payment) {
        if (payment.getStatus() == PaymentStatus.SUCCESS) return true;
        if (payment.getStatus() == PaymentStatus.REFUND_PENDING || payment.getStatus() == PaymentStatus.REFUNDED) return false;
        Booking booking = payment.getBooking();
        if (payment.getStatus() != PaymentStatus.PENDING) throw new IllegalArgumentException("Giao dịch không còn chờ thanh toán");
        payment.setPaymentTime(LocalDateTime.now());
        if (booking.getStatus() != BookingStatus.PENDING || booking.getTickets() == null || booking.getTickets().isEmpty()
                || (booking.getExpireAt() != null && !booking.getExpireAt().isAfter(LocalDateTime.now()))) {
            payment.setStatus(PaymentStatus.REFUND_PENDING);
            restorePoints(booking.getUser(), booking.getPointsUsed());
            booking.setPointsUsed(0);
            booking.setStatus(BookingStatus.CANCELLED);
            if (booking.getTickets() != null) booking.getTickets().clear();
            bookings.save(booking);
            payments.save(payment);
            afterCommit(() -> notifications.sendSystemNotificationToAdmins("Cần hoàn tiền", "Thanh toán đến sau khi đơn " + booking.getId() + " hết hạn/hủy.", "/admin/refunds", NotificationType.TRANSACTION));
            return false;
        }
        booking.setStatus(BookingStatus.COMPLETED);
        payment.setStatus(PaymentStatus.SUCCESS);
        User user = booking.getUser();
        int reward = (booking.getPointsUsed() == null || booking.getPointsUsed() == 0) && booking.getPromotion() == null
                ? (int) (booking.getTotalAmount() / 20000) : 0;
        booking.setPointsEarned(reward);
        booking.setMemberPointsEarned(memberPoints.award(user, booking.getTotalAmount()));
        user.setRewardPoints((user.getRewardPoints() == null ? 0 : user.getRewardPoints()) + reward);
        users.save(user);
        bookings.save(booking);
        payments.save(payment);
        afterCommit(() -> {
        notifications.sendNotification(user, "Thanh toán vé xem phim thành công!", "Đơn hàng TK" + booking.getId(), "/my-tickets", NotificationType.TRANSACTION);
        });
        afterCommit(() -> emails.sendCinemaTicketEmail(user.getEmail(), user.getFullName(), booking, booking.getTickets()));
        return true;
    }

    private void afterCommit(Runnable delivery) {
        if (deliveries != null) { deliveries.submit(delivery); return; }
        Runnable safe = () -> {
            try { delivery.run(); }
            catch (RuntimeException ex) { org.slf4j.LoggerFactory.getLogger(getClass()).warn("Payment confirmed; delivery failed: {}", ex.getClass().getSimpleName()); }
        };
        if (org.springframework.transaction.support.TransactionSynchronizationManager.isSynchronizationActive()) {
            org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
                    new org.springframework.transaction.support.TransactionSynchronization() {
                        @Override public void afterCommit() { safe.run(); }
                    });
        } else safe.run();
    }

    private void restorePoints(User user, Integer used) {
        if (used != null && used > 0) {
            user.setRewardPoints((user.getRewardPoints() == null ? 0 : user.getRewardPoints()) + used);
            users.save(user);
        }
    }
}
