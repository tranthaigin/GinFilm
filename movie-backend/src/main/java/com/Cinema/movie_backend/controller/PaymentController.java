package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.entity.Booking;
import com.Cinema.movie_backend.entity.Payment;
import com.Cinema.movie_backend.enums.BookingStatus;
import com.Cinema.movie_backend.enums.PaymentStatus;
import com.Cinema.movie_backend.repository.BookingRepository;
import com.Cinema.movie_backend.repository.PaymentRepository;
import com.Cinema.movie_backend.repository.OnlineTicketRepository;
import com.Cinema.movie_backend.DTO.StripePaymentRequest;
import com.stripe.Stripe;
import com.stripe.model.PaymentIntent;
import com.stripe.param.PaymentIntentCreateParams;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import jakarta.annotation.PostConstruct;

import com.Cinema.movie_backend.service.VnpayService;
import java.net.URI;
import java.util.Map;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/payment")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;
    private final OnlineTicketRepository onlineTicketRepository;
    private final com.Cinema.movie_backend.repository.TicketRepository ticketRepository;
    private final VnpayService vnpayService;
    private final com.Cinema.movie_backend.service.NotificationService notificationService;
    private final com.Cinema.movie_backend.service.EmailService emailService;
    private final com.Cinema.movie_backend.repository.UserRepository userRepository;
    private final com.Cinema.movie_backend.service.MemberPointService memberPointService;

    @Value("${stripe.api.key}")
    private String stripeApiKey;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @PostConstruct
    public void init() {
        Stripe.apiKey = stripeApiKey;
    }

    @PostMapping("/create-payment-intent")
    public ResponseEntity<?> createPaymentIntent(@RequestBody StripePaymentRequest request) {
        try {
            // VND là zero-decimal currency, amount phải >= 5000
            long amount = request.getAmount() != null ? request.getAmount() : 0L;
            if (amount < 5000)
                amount = 5000L;

            String currency = (request.getCurrency() != null && !request.getCurrency().isBlank())
                    ? request.getCurrency().toLowerCase()
                    : "vnd";

            PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                    .setAmount(amount)
                    .setCurrency(currency)
                    .setAutomaticPaymentMethods(
                            PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                                    .setEnabled(true)
                                    .build())
                    .putMetadata("bookingId", request.getBookingId() != null ? request.getBookingId() : "")
                    .build();

            PaymentIntent paymentIntent = PaymentIntent.create(params);

            Map<String, String> response = new HashMap<>();
            response.put("clientSecret", paymentIntent.getClientSecret());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("error", "Lỗi tạo payment intent: " + e.getMessage()));
        }
    }

    @GetMapping("/mock-callback")
    @Transactional
    public ResponseEntity<?> handleMockCallback(@RequestParam String txn, @RequestParam String status) {
        if (txn != null && txn.startsWith("WEB")) {
            if (status.equalsIgnoreCase("SUCCESS")) {
                com.Cinema.movie_backend.entity.OnlineTicket ticket = onlineTicketRepository.findByTicketCode(txn)
                        .orElse(null);
                if (ticket != null && ticket.getIsBanned() != null && ticket.getIsBanned()) {
                    ticket.setIsBanned(false);
                    onlineTicketRepository.save(ticket);

                    int pointsEarned = 0;
                    if ((ticket.getPointsUsed() == null || ticket.getPointsUsed() == 0)
                            && (ticket.getPromotionCode() == null || ticket.getPromotionCode().isEmpty())) {
                        pointsEarned = (int) (ticket.getPrice() / 20000);
                    }
                    com.Cinema.movie_backend.entity.User user = userRepository.findById(ticket.getUser().getId())
                            .orElse(null);
                    int memberPointsEarned = memberPointService.award(user, ticket.getPrice());
                    if (user != null && (pointsEarned > 0 || memberPointsEarned > 0)) {
                        if (pointsEarned > 0) {
                            user.setRewardPoints(
                                    (user.getRewardPoints() != null ? user.getRewardPoints() : 0) + pointsEarned);
                        }
                        userRepository.save(user);
                        ticket.setPointsEarned(pointsEarned);
                        ticket.setMemberPointsEarned(memberPointsEarned);
                        onlineTicketRepository.save(ticket);
                    }
                }
            }
            return ResponseEntity.ok("Giao dịch VOD " + txn + " đã được xử lý.");
        }

        // Tìm giao dịch theo mã
        Payment payment = paymentRepository.findByTransactionNo(txn)
                .orElseThrow(() -> new RuntimeException("Giao dịch không tồn tại"));

        Booking booking = payment.getBooking();

        if (status.equalsIgnoreCase("SUCCESS")) {
            if (booking.getStatus() != BookingStatus.COMPLETED) {
                payment.setStatus(PaymentStatus.SUCCESS);
                booking.setStatus(BookingStatus.COMPLETED);

                int pointsEarned = 0;
                if ((booking.getPointsUsed() == null || booking.getPointsUsed() == 0)
                        && booking.getPromotion() == null) {
                    pointsEarned = (int) (booking.getTotalAmount() / 20000);
                }
                com.Cinema.movie_backend.entity.User user = userRepository.findById(booking.getUser().getId())
                        .orElse(null);
                int memberPointsEarned = memberPointService.award(user, booking.getTotalAmount());
                if (user != null && (pointsEarned > 0 || memberPointsEarned > 0)) {
                    if (pointsEarned > 0) {
                        user.setRewardPoints(
                                (user.getRewardPoints() != null ? user.getRewardPoints() : 0) + pointsEarned);
                    }
                    userRepository.save(user);
                    booking.setPointsEarned(pointsEarned);
                    booking.setMemberPointsEarned(memberPointsEarned);
                }
            }
        } else {
            payment.setStatus(PaymentStatus.FAILED);
            booking.setStatus(BookingStatus.CANCELLED);

            if (booking.getPointsUsed() != null && booking.getPointsUsed() > 0) {
                com.Cinema.movie_backend.entity.User user = userRepository.findById(booking.getUser().getId())
                        .orElse(null);
                if (user != null) {
                    user.setRewardPoints(
                            (user.getRewardPoints() != null ? user.getRewardPoints() : 0) + booking.getPointsUsed());
                    userRepository.save(user);
                    booking.setPointsUsed(0);
                }
            }

            // Xóa vé để nhả ghế thực sự dưới database, tránh lỗi unique constraint
            if (booking.getTickets() != null) {
                booking.getTickets().clear();
            }
        }

        payment.setPaymentTime(LocalDateTime.now());
        paymentRepository.save(payment);
        bookingRepository.save(booking);

        return ResponseEntity.ok("Giao dịch " + txn + " đã được xử lý với trạng thái: " + status);
    }

    @GetMapping("/vnpay-callback")
    @Transactional
    public ResponseEntity<?> handleVnpayCallback(@RequestParam Map<String, String> params) {
        try {
            boolean isValidSignature = vnpayService.verifyCallback(params);
            String frontendRedirectUrl = frontendUrl + "/my-tickets";

            if (!isValidSignature) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid signature");
            }

            String txnRef = params.get("vnp_TxnRef");
            String responseCode = params.get("vnp_ResponseCode");

            if (txnRef != null && txnRef.startsWith("POS")) {
                frontendRedirectUrl = frontendUrl + "/staff/pos";
            }

            if (txnRef != null && txnRef.startsWith("WEB")) {
                com.Cinema.movie_backend.entity.OnlineTicket ticket = onlineTicketRepository.findByTicketCode(txnRef)
                        .orElse(null);
                if (ticket != null) {
                    if ("00".equals(responseCode)) {
                        if (Boolean.TRUE.equals(ticket.getIsBanned())) {
                            ticket.setIsBanned(false);

                            int pointsEarned = 0;
                            if ((ticket.getPointsUsed() == null || ticket.getPointsUsed() == 0)
                                    && (ticket.getPromotionCode() == null || ticket.getPromotionCode().isEmpty())) {
                                pointsEarned = (int) (ticket.getPrice() / 20000);
                            }
                            com.Cinema.movie_backend.entity.User user = userRepository
                                    .findById(ticket.getUser().getId()).orElse(null);
                            int memberPointsEarned = memberPointService.award(user, ticket.getPrice());
                            if (user != null && (pointsEarned > 0 || memberPointsEarned > 0)) {
                                if (pointsEarned > 0) {
                                    user.setRewardPoints(
                                            (user.getRewardPoints() != null ? user.getRewardPoints() : 0)
                                                    + pointsEarned);
                                }
                                userRepository.save(user);
                                ticket.setPointsEarned(pointsEarned);
                                ticket.setMemberPointsEarned(memberPointsEarned);
                            }
                            onlineTicketRepository.save(ticket);

                            String notificationMessage = String.format(
                                    "Bạn đã mua thành công vé xem phim trực tuyến **%s**. Mã vé: **%s**. Truy cập mục Vé của tôi để kích hoạt xem phim ngay!",
                                    ticket.getMovie().getTitle(), ticket.getTicketCode());
                            String redirectLink = "/my-tickets?ticketCode=" + ticket.getTicketCode();
                            notificationService.sendNotification(ticket.getUser(),
                                    "Thanh toán vé trực tuyến thành công!",
                                    notificationMessage,
                                    redirectLink, com.Cinema.movie_backend.entity.NotificationType.TRANSACTION);
                            emailService.sendOnlineMovieTicketEmail(ticket.getUser().getEmail(),
                                    ticket.getUser().getFullName(), ticket);
                        }
                    } else {
                        if (ticket.getPointsUsed() != null && ticket.getPointsUsed() > 0) {
                            com.Cinema.movie_backend.entity.User user = userRepository
                                    .findById(ticket.getUser().getId()).orElse(null);
                            if (user != null) {
                                user.setRewardPoints((user.getRewardPoints() != null ? user.getRewardPoints() : 0)
                                        + ticket.getPointsUsed());
                                userRepository.save(user);
                            }
                        }
                        onlineTicketRepository.delete(ticket);
                    }
                }
            } else {
                // Find payment by txnRef
                Payment payment = paymentRepository.findByTransactionNo(txnRef).orElse(null);

                if (payment != null) {
                    Booking booking = payment.getBooking();
                    if ("00".equals(responseCode)) {
                        if (booking.getStatus() == BookingStatus.CANCELLED || booking.getTickets() == null || booking.getTickets().isEmpty()) {
                            payment.setStatus(PaymentStatus.SUCCESS);
                            payment.setPaymentTime(LocalDateTime.now());
                            paymentRepository.save(payment);
                            
                            String finalRedirectUrl = frontendRedirectUrl + "?vnp_ResponseCode=" + responseCode + "&refund_required=true";
                            HttpHeaders headers = new HttpHeaders();
                            headers.setLocation(URI.create(finalRedirectUrl));
                            return new ResponseEntity<>(headers, HttpStatus.FOUND);
                        }

                        if (booking.getStatus() != BookingStatus.COMPLETED) {
                            payment.setStatus(PaymentStatus.SUCCESS);
                            booking.setStatus(BookingStatus.COMPLETED);

                            int pointsEarned = 0;
                            if ((booking.getPointsUsed() == null || booking.getPointsUsed() == 0)
                                    && booking.getPromotion() == null) {
                                pointsEarned = (int) (booking.getTotalAmount() / 20000);
                            }
                            com.Cinema.movie_backend.entity.User user = userRepository
                                    .findById(booking.getUser().getId()).orElse(null);
                            int memberPointsEarned = memberPointService.award(user, booking.getTotalAmount());
                            if (user != null && (pointsEarned > 0 || memberPointsEarned > 0)) {
                                if (pointsEarned > 0) {
                                    user.setRewardPoints(
                                            (user.getRewardPoints() != null ? user.getRewardPoints() : 0)
                                                    + pointsEarned);
                                }
                                userRepository.save(user);
                                booking.setPointsEarned(pointsEarned);
                                booking.setMemberPointsEarned(memberPointsEarned);
                            }
                        }

                        String ticketCodeForNotif = booking.getTicketCode() != null ? booking.getTicketCode()
                                : ("TK" + booking.getId());
                        String notificationMessage = String.format(
                                "Đơn hàng **%s** đã được thanh toán thành công qua VNPAY. Hẹn gặp bạn tại rạp nhé!",
                                ticketCodeForNotif);
                        String redirectLink = "/my-tickets?ticketCode=" + ticketCodeForNotif;
                        notificationService.sendNotification(booking.getUser(), "Thanh toán vé xem phim thành công!",
                                notificationMessage, redirectLink,
                                com.Cinema.movie_backend.entity.NotificationType.TRANSACTION);
                        emailService.sendCinemaTicketEmail(booking.getUser().getEmail(),
                                booking.getUser().getFullName(), booking,
                                booking.getTickets());

                    } else {
                        payment.setStatus(PaymentStatus.FAILED);
                        booking.setStatus(BookingStatus.CANCELLED);

                        if (booking.getPointsUsed() != null && booking.getPointsUsed() > 0) {
                            com.Cinema.movie_backend.entity.User user = userRepository
                                    .findById(booking.getUser().getId()).orElse(null);
                            if (user != null) {
                                user.setRewardPoints((user.getRewardPoints() != null ? user.getRewardPoints() : 0)
                                        + booking.getPointsUsed());
                                userRepository.save(user);
                                booking.setPointsUsed(0);
                            }
                        }

                        if (booking.getTickets() != null) {
                            booking.getTickets().clear();
                        }
                    }
                    payment.setPaymentTime(LocalDateTime.now());
                    paymentRepository.save(payment);
                    bookingRepository.save(booking);
                }
            }

            String finalRedirectUrl = frontendRedirectUrl + "?vnp_ResponseCode=" + responseCode;
            if ("00".equals(responseCode)) {
                finalRedirectUrl += "&success=true";
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setLocation(URI.create(finalRedirectUrl));
            return new ResponseEntity<>(headers, HttpStatus.FOUND);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error processing callback: " + e.getMessage());
        }
    }
}
