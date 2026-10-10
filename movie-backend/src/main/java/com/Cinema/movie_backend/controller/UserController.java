package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.entity.User;
import com.Cinema.movie_backend.service.UserService;
import com.Cinema.movie_backend.service.SecurityActivityService;
import com.Cinema.movie_backend.service.NotificationService;
import com.Cinema.movie_backend.entity.NotificationType;
import com.Cinema.movie_backend.util.JwtUtil;
import com.Cinema.movie_backend.DTO.ChangePasswordRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final JwtUtil jwtUtil;
    private final NotificationService notificationService;
    private final SecurityActivityService securityActivityService;

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(
            @CookieValue(value = "accessToken", required = false) String token,
            @Valid @RequestBody ChangePasswordRequest request,
            jakarta.servlet.http.HttpServletRequest httpRequest) {
        if (token == null || token.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Vui lòng đăng nhập"));
        }

        try {
            String email = jwtUtil.extractEmail(token);
            if (email == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Token không hợp lệ"));
            }

            if (request.getNewPassword() == null || !request.getNewPassword().equals(request.getConfirmPassword())) {
                return ResponseEntity.badRequest().body(Map.of("message", "Mật khẩu xác nhận không khớp."));
            }

            User user = userService.changePassword(email, request.getOldPassword(), request.getNewPassword());

            String userName = user.getFullName() != null ? user.getFullName() : user.getUsername();
            boolean isAdmin = user.getRoles().stream().anyMatch(r -> r.getName().toUpperCase().contains("ADMIN"));
            boolean isStaff = user.getRoles().stream().anyMatch(r -> r.getName().toUpperCase().contains("STAFF"));
            NotificationType notifType = (isAdmin || isStaff) ? NotificationType.ADMIN_SYSTEM : NotificationType.SYSTEM;

            notificationService.sendNotification(user, "Đổi mật khẩu thành công", "Mật khẩu của tài khoản " + userName + " đã được thay đổi thành công.", "/profile", notifType);

            String deviceId = httpRequest.getHeader("X-Device-Id");
            securityActivityService.logActivity(user, com.Cinema.movie_backend.entity.SecurityActionType.PASSWORD_CHANGED, httpRequest, deviceId);

            return ResponseEntity.ok(Map.of("message", "Đổi mật khẩu thành công."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
