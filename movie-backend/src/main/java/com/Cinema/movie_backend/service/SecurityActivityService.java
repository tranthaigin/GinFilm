package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.entity.SecurityActionType;
import com.Cinema.movie_backend.entity.SecurityActivityLog;
import com.Cinema.movie_backend.entity.User;
import com.Cinema.movie_backend.entity.NotificationType;
import com.Cinema.movie_backend.repository.SecurityActivityLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SecurityActivityService {

    private final SecurityActivityLogRepository activityLogRepository;
    private final EmailService emailService;
    private final NotificationService notificationService;
    private final com.Cinema.movie_backend.repository.UserRepository userRepository;

    @Transactional
    public void logActivityByEmail(String email, SecurityActionType actionType, HttpServletRequest request, String deviceId) {
        userRepository.findByEmailManual(email).ifPresent(user -> {
            logActivity(user, actionType, request, deviceId);
        });
    }

    @Transactional
    public void logActivity(User user, SecurityActionType actionType, HttpServletRequest request, String deviceId) {
        String ipAddress = extractIpAddress(request);
        String deviceInfo = extractDeviceInfo(request);

        SecurityActivityLog log = SecurityActivityLog.builder()
                .user(user)
                .actionType(actionType)
                .ipAddress(ipAddress)
                .deviceInfo(deviceInfo)
                .deviceId(deviceId != null ? deviceId : "Unknown")
                .build();

        activityLogRepository.save(log);

        sendAlertIfNeeded(user, actionType, deviceInfo, ipAddress);
    }

    private String extractIpAddress(HttpServletRequest request) {
        if (request == null) return "Unknown";
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        return ip != null ? ip.split(",")[0].trim() : "Unknown";
    }

    private String extractDeviceInfo(HttpServletRequest request) {
        if (request == null) return "Thiết bị không xác định";
        String ua = request.getHeader("User-Agent");
        if (ua == null || ua.isEmpty()) return "Thiết bị không xác định";

        String device = "Thiết bị khác";
        String uaLower = ua.toLowerCase();

        if (uaLower.contains("windows")) {
            device = "Máy tính Windows";
        } else if (uaLower.contains("macintosh") || uaLower.contains("mac os x")) {
            device = "Máy tính Mac";
        } else if (uaLower.contains("iphone")) {
            device = "Điện thoại iPhone";
        } else if (uaLower.contains("ipad")) {
            device = "Máy tính bảng iPad";
        } else if (uaLower.contains("android")) {
            if (uaLower.contains("mobile")) {
                device = "Điện thoại Android";
            } else {
                device = "Máy tính bảng Android";
            }
        } else if (uaLower.contains("linux")) {
            device = "Máy tính Linux";
        }

        String browser = "Trình duyệt khác";
        if (uaLower.contains("edg")) browser = "Edge";
        else if (uaLower.contains("chrome")) browser = "Chrome";
        else if (uaLower.contains("safari") && !uaLower.contains("chrome")) browser = "Safari";
        else if (uaLower.contains("firefox")) browser = "Firefox";
        else if (uaLower.contains("opera") || uaLower.contains("opr")) browser = "Opera";

        return device + " (" + browser + ")";
    }

    private void sendAlertIfNeeded(User user, SecurityActionType actionType, String deviceInfo, String ipAddress) {
        String title = null;
        String message = null;

        switch (actionType) {
            case LOGIN:
                title = "Cảnh báo đăng nhập mới";
                message = "Tài khoản của bạn vừa đăng nhập thành công từ thiết bị: " + deviceInfo + " (IP: " + ipAddress + "). Nếu đây không phải là bạn, hãy đổi mật khẩu ngay lập tức.";
                break;
            case PASSWORD_CHANGED:
                title = "Mật khẩu đã được thay đổi";
                message = "Mật khẩu tài khoản của bạn đã được thay đổi từ thiết bị: " + deviceInfo + ".";
                break;
            case FORGOT_PASSWORD_RESET:
                title = "Mật khẩu đã được đặt lại";
                message = "Mật khẩu của bạn đã được đặt lại (Quên mật khẩu) từ thiết bị: " + deviceInfo + ".";
                break;
            case PIN_SETUP:
                title = "Mã PIN bảo mật đã được thiết lập";
                message = "Bạn vừa thiết lập mã PIN bảo vệ vé từ thiết bị: " + deviceInfo + ".";
                break;
            case PIN_CHANGED:
                title = "Mã PIN bảo mật đã được thay đổi";
                message = "Bạn vừa thay đổi mã PIN bảo vệ vé từ thiết bị: " + deviceInfo + ".";
                break;
            case ACCOUNT_CREATED:
            case LOGOUT:
            default:
                // No email/notification needed
                return;
        }

        if (title != null && message != null) {
            String link = "/profile?tab=security-activities";
            boolean isAdmin = user.getRoles().stream().anyMatch(r -> r.getName().toUpperCase().contains("ADMIN"));
            boolean isStaff = user.getRoles().stream().anyMatch(r -> r.getName().toUpperCase().contains("STAFF"));
            
            if (isAdmin) {
                link = "/admin/system-activity";
            } else if (isStaff) {
                link = "/staff/system-activity";
            }
            
            notificationService.sendNotification(user, title, message, link, NotificationType.WARNING);
            try {
                emailService.sendSystemEmail(user.getEmail(), user.getFullName(), title, message);
            } catch (Exception e) {
                // Log exception if necessary
            }
        }
    }

    @Transactional(readOnly = true)
    public Page<SecurityActivityLog> getUserActivities(UUID userId, Pageable pageable) {
        return activityLogRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<SecurityActivityLog> getAllActivities(String roleName, Pageable pageable) {
        if (roleName != null && !roleName.trim().isEmpty()) {
            String dbRoleName = roleName.toUpperCase();
            if (!dbRoleName.startsWith("ROLE_")) {
                dbRoleName = "ROLE_" + dbRoleName;
            }
            return activityLogRepository.findByUserRoleOrderByCreatedAtDesc(dbRoleName, pageable);
        }
        return activityLogRepository.findAllByOrderByCreatedAtDesc(pageable);
    }
}
