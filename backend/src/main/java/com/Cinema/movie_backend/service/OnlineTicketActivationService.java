package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.entity.OnlineTicket;
import com.Cinema.movie_backend.entity.User;
import com.Cinema.movie_backend.entity.UserPinSecurity;
import com.Cinema.movie_backend.repository.OnlineTicketRepository;
import com.Cinema.movie_backend.repository.TicketActivationHistoryRepository;
import com.Cinema.movie_backend.entity.TicketActivationHistory;
import com.Cinema.movie_backend.repository.UserPinSecurityRepository;
import com.Cinema.movie_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class OnlineTicketActivationService {

    private final OnlineTicketRepository onlineTicketRepository;
    private final UserPinSecurityRepository userPinSecurityRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final NotificationService notificationService;
    private final TicketActivationHistoryRepository ticketActivationHistoryRepository;

    private static final int MAX_FAILED_ATTEMPTS = 5;

    @Transactional(noRollbackFor = com.Cinema.movie_backend.exception.InvalidPinException.class)
    public Map<String, Object> activateOrWatchTicket(String email, String ticketCode, String pinCode, boolean forceOverride, String currentSessionId, boolean isActivateIntent, String ipAddress, String deviceInfo) {
        OnlineTicket ticket = onlineTicketRepository.findLockedByTicketCode(ticketCode)
                .orElseThrow(() -> new RuntimeException("Mã vé không tồn tại."));

        if (ticket.getIsBanned() != null && ticket.getIsBanned()) {
            throw new RuntimeException("Mã vé này đã bị khóa bởi quản trị viên.");
        }

        if (ticket.getPaymentStatus() != com.Cinema.movie_backend.enums.PaymentStatus.SUCCESS
                || currentSessionId == null || currentSessionId.isBlank()) {
            throw new IllegalArgumentException("Payment or viewing session is invalid");
        }

        // Use the ticket OWNER's PIN for validation, allowing ticket sharing
        UserPinSecurity pinSecurity = userPinSecurityRepository.findLockedByUserId(ticket.getUser().getId())
                .orElseThrow(() -> new RuntimeException("Chủ vé chưa thiết lập mã PIN bảo mật."));

        // Check if locked
        if (pinSecurity.getPinLockedUntil() != null && pinSecurity.getPinLockedUntil().isAfter(LocalDateTime.now())) {
            throw new RuntimeException("Nhập sai mã PIN quá nhiều lần. Vui lòng thử lại sau hoặc yêu cầu chủ vé đặt lại mã PIN.");
        }

        // Validate PIN
        if (!passwordEncoder.matches(pinCode, pinSecurity.getPinCode())) {
            int attempts = pinSecurity.getFailedPinAttempts() == null ? 0 : pinSecurity.getFailedPinAttempts();
            attempts++;
            pinSecurity.setFailedPinAttempts(attempts);

            if (attempts >= MAX_FAILED_ATTEMPTS) {
                // progressive lock: 15 mins for 5 attempts, 1 hr for 10 attempts
                int lockMinutes = (attempts >= 10) ? 60 : 15;
                pinSecurity.setPinLockedUntil(LocalDateTime.now().plusMinutes(lockMinutes));
                userPinSecurityRepository.save(pinSecurity);
                throw new com.Cinema.movie_backend.exception.InvalidPinException("Sai mã PIN quá nhiều lần. Mã PIN bảo vệ của vé này đã bị khóa trong " + lockMinutes + " phút.");
            }
            userPinSecurityRepository.save(pinSecurity);
            throw new com.Cinema.movie_backend.exception.InvalidPinException("Mã PIN không chính xác.");
        }

        // Correct PIN
        pinSecurity.setFailedPinAttempts(0);
        pinSecurity.setPinLockedUntil(null);
        userPinSecurityRepository.save(pinSecurity);

        // Ticket activation logic
        boolean isFirstTime = false;
        if (ticket.getActivatedAt() == null) {
            // First time activation
            ticket.setActivatedAt(LocalDateTime.now());
            // Absolute expiry: 48 hours from activation
            ticket.setExpiresAt(LocalDateTime.now().plusHours(48));
            isFirstTime = true;
        } else {
            if (isActivateIntent) {
                throw new RuntimeException("Mã vé này đã được kích hoạt trước đó.");
            }
            // Check expiration
            if (ticket.getExpiresAt() != null && ticket.getExpiresAt().isBefore(LocalDateTime.now())) {
                throw new RuntimeException("Mã vé này đã quá thời hạn 48 giờ sử dụng kể từ lần xem đầu tiên.");
            }
            if (ticket.getConsumedTimeSeconds() != null && ticket.getTimeLimitMinutes() != null &&
                ticket.getConsumedTimeSeconds() >= ticket.getTimeLimitMinutes() * 60) {
                throw new RuntimeException("Mã vé này đã sử dụng hết hạn mức thời gian xem.");
            }
        }

        // Track who is currently viewing
        User viewer = userRepository.findByEmailManual(email)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thông tin tài khoản người xem"));

        // Session tracking logic for concurrency control
        if (ticket.getCurrentSessionToken() != null && !ticket.getCurrentSessionToken().equals(currentSessionId)) {
            if (!forceOverride) {
                throw new RuntimeException("CONCURRENT_STREAM_DETECTED:Đang có người xem bộ phim này. Bạn có muốn tiếp tục không?");
            }
            // forced override: send notification to the PREVIOUS viewer
            if (ticket.getCurrentViewer() != null && !ticket.getCurrentViewer().getId().equals(viewer.getId())) {
                String overrideTitle = "Luồng xem bị gián đoạn";
                String viewerName = viewer.getFullName() != null ? viewer.getFullName() : viewer.getUsername();
                String overrideMsg = "Vé xem phim " + (ticket.getMovie() != null ? ticket.getMovie().getTitle() : "") +
                                     " đang được tiếp tục xem ở một thiết bị khác bởi " + viewerName + ".";
                notificationService.sendNotification(ticket.getCurrentViewer(), overrideTitle, overrideMsg, "/my-tickets", com.Cinema.movie_backend.entity.NotificationType.WARNING);
            }
        }

        ticket.setCurrentSessionToken(currentSessionId);
        ticket.setIpAddress(ipAddress);
        ticket.setDeviceInfo(deviceInfo);
        ticket.setCurrentViewer(viewer);
        onlineTicketRepository.save(ticket);

        if (isFirstTime) {
            String title = "Kích hoạt vé xem trực tuyến thành công";
            String viewerName = viewer.getFullName() != null ? viewer.getFullName() : viewer.getUsername();
            String message = "Vé xem phim " + (ticket.getMovie() != null ? ticket.getMovie().getTitle() : "") +
                             " của bạn đã được kích hoạt thành công bởi " + viewerName + " từ thiết bị: " + (deviceInfo != null ? deviceInfo : "Máy tính Windows (Edge)") + ". Vé sẽ tự động thu hồi quyền xem sau 48 giờ.";
            notificationService.sendNotification(ticket.getUser(), title, message, null, com.Cinema.movie_backend.entity.NotificationType.SYSTEM);
            try {
                emailService.sendActivationEmail(ticket.getUser().getEmail(), viewerName, ticket, viewer.getEmail() != null ? viewer.getEmail() : email, deviceInfo);
            } catch (Exception e) {}

            TicketActivationHistory history = TicketActivationHistory.builder()
                .ticketCode(ticket.getTicketCode())
                .username(viewerName)
                .movieName(ticket.getMovie() != null ? ticket.getMovie().getTitle() : "")
                .ipAddress(ipAddress)
                .deviceInfo(deviceInfo)
                .activatedAt(LocalDateTime.now())
                .build();
            ticketActivationHistoryRepository.save(history);
        }

        // Return a watch token and movieId
        Map<String, Object> result = new java.util.HashMap<>();
        result.put("token", currentSessionId);
        result.put("movieId", ticket.getMovie().getId());
        result.put("expiresAt", ticket.getExpiresAt() != null ? ticket.getExpiresAt().atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli() : null);
        result.put("consumedTimeSeconds", ticket.getConsumedTimeSeconds() != null ? ticket.getConsumedTimeSeconds() : 0);
        result.put("timeLimitMinutes", ticket.getTimeLimitMinutes());

        return result;
    }

    @Transactional(readOnly = true)
    public boolean isTicketActivated(String email, String ticketCode) {
        OnlineTicket ticket = onlineTicketRepository.findByTicketCode(ticketCode)
                .orElseThrow(() -> new RuntimeException("Mã vé không tồn tại."));

        return ticket.getActivatedAt() != null;
    }

    @Transactional(readOnly = true)
    public boolean isSessionValid(String ticketCode, String currentSessionId, String email) {
        return onlineTicketRepository.findByTicketCode(ticketCode)
                .map(ticket -> currentSessionId != null && currentSessionId.equals(ticket.getCurrentSessionToken())
                        && ticket.getCurrentViewer() != null && email.equals(ticket.getCurrentViewer().getEmail())
                        && !Boolean.TRUE.equals(ticket.getIsBanned())
                        && ticket.getPaymentStatus() == com.Cinema.movie_backend.enums.PaymentStatus.SUCCESS)
                .orElse(false);
    }

    public boolean isTicketExpired(String ticketCode) {
        return onlineTicketRepository.findByTicketCode(ticketCode)
                .map(ticket -> {
                    if (ticket.getExpiresAt() != null && ticket.getExpiresAt().isBefore(LocalDateTime.now())) {
                        return true;
                    }
                    if (ticket.getConsumedTimeSeconds() != null && ticket.getTimeLimitMinutes() != null &&
                        ticket.getConsumedTimeSeconds() >= ticket.getTimeLimitMinutes() * 60) {
                        return true;
                    }
                    return false;
                })
                .orElse(true);
    }
}
