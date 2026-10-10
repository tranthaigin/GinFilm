package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.DTO.GoogleLoginRequest;
import com.Cinema.movie_backend.DTO.LoginRequest;
import com.Cinema.movie_backend.DTO.RegisterRequest;
import com.Cinema.movie_backend.DTO.UpdateProfileRequest;
import com.Cinema.movie_backend.DTO.UserResponse;
import com.Cinema.movie_backend.DTO.VerifyOtpRequest;
import com.Cinema.movie_backend.DTO.ResetPasswordRequest;
import com.Cinema.movie_backend.entity.Otptype;
import com.Cinema.movie_backend.entity.RefreshToken;
import com.Cinema.movie_backend.entity.User;
import com.Cinema.movie_backend.exception.AccountTemporarilyLockedException;
import com.Cinema.movie_backend.service.UserService;
import com.Cinema.movie_backend.service.OtpService;
import com.Cinema.movie_backend.service.RefreshTokenService;
import com.Cinema.movie_backend.util.JwtUtil;
import com.Cinema.movie_backend.repository.ChatMessageRepository;
import com.Cinema.movie_backend.repository.RefreshTokenRepository;
import com.Cinema.movie_backend.service.NotificationService;
import com.Cinema.movie_backend.entity.NotificationType;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.format.DateTimeFormatter;
import java.util.Map;
import com.Cinema.movie_backend.service.SecurityActivityService;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AccountController {

    private final UserService userService;
    private final OtpService otpService;
    private final JwtUtil jwtUtil;
    private final RefreshTokenService refreshTokenService;
    private final ChatMessageRepository chatMessageRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final NotificationService notificationService;
    private final SecurityActivityService securityActivityService;

    /**
     * Endpoint: POST /api/auth/login
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest, HttpServletRequest request) {
            User user = userService.login(loginRequest.getEmail(), loginRequest.getPassword());
            UserResponse safeResponse = UserResponse.fromEntity(user);
            String accessToken = jwtUtil.generateToken(user);
            RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);

            ResponseCookie jwtCookie = ResponseCookie.from("accessToken", accessToken)
                    .httpOnly(true)
                    .secure(true)
                    .sameSite("None")
                    .path("/")
                    .maxAge(7 * 24 * 60 * 60)
                    .build();

            ResponseCookie refreshCookie = ResponseCookie.from("refreshToken", refreshToken.getToken())
                    .httpOnly(true)
                    .secure(true)
                    .sameSite("None")
                    .path("/")
                    .maxAge(7 * 24 * 60 * 60)
                    .build();

            boolean isAdmin = user.getRoles().stream().anyMatch(r -> r.getName().toUpperCase().contains("ADMIN"));
            boolean isStaff = user.getRoles().stream().anyMatch(r -> r.getName().toUpperCase().contains("STAFF"));
            String userName = user.getFullName() != null ? user.getFullName() : user.getUsername();
            String title = "Đăng nhập hệ thống";
            String message;
            String link = null;
            NotificationType notifType = NotificationType.SYSTEM;

            if (isAdmin) {
                message = "Hệ thống ghi nhận Quản trị viên " + userName + " vừa đăng nhập.";
                notifType = NotificationType.ADMIN_SYSTEM;
            } else if (isStaff) {
                message = "Hệ thống ghi nhận Nhân viên " + userName + " vừa đăng nhập.";
                notifType = NotificationType.ADMIN_SYSTEM;
            } else {
                message = "Hệ thống ghi nhận Khách hàng " + userName + " vừa đăng nhập.";
            }
            notificationService.sendNotification(user, title, message, link, notifType);

            String deviceId = request.getHeader("X-Device-Id");
            securityActivityService.logActivity(user, com.Cinema.movie_backend.entity.SecurityActionType.LOGIN, request, deviceId);

            Map<String, Object> response = new java.util.HashMap<>();
            response.put("user", safeResponse);

            return ResponseEntity.ok()
                    .header(HttpHeaders.SET_COOKIE, jwtCookie.toString())
                    .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
                    .body(response);

    }

    /**
     * Endpoint: POST /api/auth/unlock-account
     */
    @PostMapping("/unlock-account")
    public ResponseEntity<?> unlockAccount(@RequestBody VerifyOtpRequest request) {
            userService.unlockAccount(request.getEmail(), request.getOtp());
            return ResponseEntity.ok(Map.of("message", "Mở khóa tài khoản thành công. Bạn có thể đăng nhập lại."));
    }

    @PostMapping("/resend-unlock-otp")
    public ResponseEntity<?> resendUnlockOtp(@RequestBody Map<String, String> request) {
            String email = request.get("email");
            if (email == null || email.trim().isEmpty()) {
                throw new RuntimeException("Vui lòng cung cấp email");
            }
            userService.checkAndResendUnlockOtp(email);
            return ResponseEntity.ok(Map.of("message", "Đã gửi lại mã mở khóa. Vui lòng kiểm tra email."));
    }

    /**
     * Endpoint: POST /api/auth/refresh
     * Nhận refresh token, trả về access token mới.
     */
    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@CookieValue(value = "refreshToken", required = false) String refreshTokenStr) {
        if (refreshTokenStr == null || refreshTokenStr.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Vui lòng cung cấp refresh token"));
        }
            String newAccessToken = refreshTokenService.verifyAndGenerateAccessToken(refreshTokenStr);
            ResponseCookie jwtCookie = ResponseCookie.from("accessToken", newAccessToken)
                    .httpOnly(true)
                    .secure(true)
                    .sameSite("None")
                    .path("/")
                    .maxAge(7 * 24 * 60 * 60)
                    .build();

            return ResponseEntity.ok()
                    .header(HttpHeaders.SET_COOKIE, jwtCookie.toString())
                    .body(Map.of("message", "Token refreshed"));
    }

    /**
     * Endpoint: POST /api/auth/logout
     * Thu hồi refresh token, buộc đăng nhập lại.
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(
            @CookieValue(value = "accessToken", required = false) String accessTokenCookie,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @CookieValue(value = "refreshToken", required = false) String refreshTokenStr, 
            HttpServletRequest request) {
        
        // 1. Tìm User đang đăng xuất để xóa lịch sử Chat (Dùng AccessToken để đảm bảo)
        String tokenToExtract = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            tokenToExtract = authHeader.substring(7);
        } else if (accessTokenCookie != null && !accessTokenCookie.isBlank()) {
            tokenToExtract = accessTokenCookie;
        }

        if (tokenToExtract != null) {
            try {
                String email = jwtUtil.extractEmail(tokenToExtract);
                User user = userService.findByEmail(email);
                if (user != null && user.getRoles().stream().anyMatch(role -> "ROLE_USER".equals(role.getName()))) {
                    chatMessageRepository.deleteByConversationId(user.getId());
                }
            } catch (Exception e) {
                // Bỏ qua lỗi nếu Token đã hết hạn, vì đằng nào cũng đang logout
            }
        }

        // 2. Thu hồi Refresh Token
        if (refreshTokenStr != null && !refreshTokenStr.isBlank()) {
            refreshTokenRepository.findByToken(refreshTokenStr).ifPresent(rt -> {
                User user = rt.getUser();
                if (user != null) {
                    String deviceId = request.getHeader("X-Device-Id");
                    securityActivityService.logActivity(user, com.Cinema.movie_backend.entity.SecurityActionType.LOGOUT, request, deviceId);
                }
                // (Đã chuyển logic xóa chat lên trên để đảm bảo luôn chạy)
            });
            refreshTokenService.revokeToken(refreshTokenStr);
        }

        ResponseCookie jwtCookie = ResponseCookie.from("accessToken", "")
                .httpOnly(true)
                .secure(true)
                .sameSite("None")
                .path("/")
                .maxAge(0)
                .build();

        ResponseCookie refreshCookie = ResponseCookie.from("refreshToken", "")
                .httpOnly(true)
                .secure(true)
                .sameSite("None")
                .path("/")
                .maxAge(0)
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, jwtCookie.toString())
                .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
                .body(Map.of("message", "Đăng xuất thành công"));
    }

    /**
     * Endpoint: POST /api/auth/register
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest registerRequest, HttpServletRequest request) {
            User newUser = new User();
            newUser.setUsername(registerRequest.getUsername());
            newUser.setEmail(registerRequest.getEmail());
            newUser.setPassword(registerRequest.getPassword());
            newUser.setPhoneNumber(registerRequest.getPhoneNumber());
            newUser.setFullName(registerRequest.getFullName());
            newUser.setDateOfBirth(registerRequest.getDateOfBirth());

            User createdUser = userService.register(newUser);
            UserResponse safeResponse = UserResponse.fromEntity(createdUser);

            String deviceId = request.getHeader("X-Device-Id");
            securityActivityService.logActivity(createdUser, com.Cinema.movie_backend.entity.SecurityActionType.ACCOUNT_CREATED, request, deviceId);

            return ResponseEntity.status(HttpStatus.CREATED).body(safeResponse);
    }

    @PostMapping("/google-login")
    public ResponseEntity<?> googleLogin(@Valid @RequestBody GoogleLoginRequest request, HttpServletRequest httpRequest) {
            // Bước 1: Giao token Google cho Service kiểm tra.
            User user = userService.loginWithGoogle(request.getIdToken());

            // Bước 2: Dùng JwtUtil bóc thông tin User (Email, Role) đưa vào Token của hệ
            // thống
            String accessToken = jwtUtil.generateToken(user);
            RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);
            UserResponse safeResponse = UserResponse.fromEntity(user);

            String userName = user.getFullName() != null ? user.getFullName() : user.getUsername();
            boolean isGoogleAdmin = user.getRoles().stream().anyMatch(r -> r.getName().toUpperCase().contains("ADMIN"));
            boolean isGoogleStaff = user.getRoles().stream().anyMatch(r -> r.getName().toUpperCase().contains("STAFF"));
            NotificationType notifType = (isGoogleAdmin || isGoogleStaff) ? NotificationType.ADMIN_SYSTEM : NotificationType.SYSTEM;

            notificationService.sendNotification(user, "Đăng nhập Google", "Hệ thống ghi nhận " + userName + " vừa đăng nhập bằng Google.", null, notifType);

            if (user.getPhoneNumber() == null || user.getPhoneNumber().trim().isEmpty()) {
                notificationService.sendNotification(
                        user,
                        "Cập nhật số điện thoại",
                        "Vui lòng cập nhật số điện thoại để chúng tôi có thể bảo vệ tài khoản và giúp bạn giao dịch an toàn.",
                        "/profile?updatePhone=true",
                        NotificationType.SYSTEM
                );
            }

            // Bước 3: Trả Token an toàn về cho Frontend
            ResponseCookie jwtCookie = ResponseCookie.from("accessToken", accessToken)
                    .httpOnly(true)
                    .secure(true)
                    .sameSite("None")
                    .path("/")
                    .maxAge(7 * 24 * 60 * 60)
                    .build();

            ResponseCookie refreshCookie = ResponseCookie.from("refreshToken", refreshToken.getToken())
                    .httpOnly(true)
                    .secure(true)
                    .sameSite("None")
                    .path("/")
                    .maxAge(7 * 24 * 60 * 60)
                    .build();

            Map<String, Object> response = new java.util.HashMap<>();
            response.put("user", safeResponse);
            response.put("accessToken", accessToken);
            response.put("refreshToken", refreshToken.getToken());

            String deviceId = httpRequest.getHeader("X-Device-Id");
            securityActivityService.logActivity(user, com.Cinema.movie_backend.entity.SecurityActionType.LOGIN, httpRequest, deviceId);

            return ResponseEntity.ok()
                    .header(HttpHeaders.SET_COOKIE, jwtCookie.toString())
                    .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
                    .body(response);

    }

    @PostMapping("/verify-account")
    public ResponseEntity<?> verifyAccount(@RequestBody VerifyOtpRequest verifyOtpRequest) {
            userService.verifyAccount(verifyOtpRequest.getEmail(), verifyOtpRequest.getOtp());
            return ResponseEntity.ok(
                    Map.of("message", "Tài khoản đã được xác thực thành công!, Bạn có thể đăng nhập ngay bây giờ."));
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<?> resendVerification(@RequestBody Map<String, String> request) {
            String email = request.get("email");
            if (email == null || email.trim().isEmpty()) {
                throw new RuntimeException("Vui lòng cung cấp email");
            }
            // Trực tiếp gọi OtpService để sinh mã
            otpService.generateAndSendOtp(email, Otptype.ACCOUNT_VERIFICATION);
            return ResponseEntity.ok(Map.of("message", "Đã gửi lại mã xác thực. Vui lòng kiểm tra email."));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {
            String email = request.get("email");
            if (email == null || email.trim().isEmpty()) {
                throw new RuntimeException("Vui lòng cung cấp email");
            }
            // Trực tiếp gọi OtpService để sinh mã khôi phục
            otpService.generateAndSendOtp(email, Otptype.PASSWORD_RESET);
            return ResponseEntity
                    .ok(Map.of("message", "Mã xác nhận khôi phục mật khẩu đã được gửi đến email của bạn."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
            User user = userService.resetPassword(request.getEmail(), request.getOtp(), request.getNewPassword());

            String userName = user.getFullName() != null ? user.getFullName() : user.getUsername();
            boolean isAdmin = user.getRoles().stream().anyMatch(r -> r.getName().toUpperCase().contains("ADMIN"));
            boolean isStaff = user.getRoles().stream().anyMatch(r -> r.getName().toUpperCase().contains("STAFF"));
            NotificationType notifType = (isAdmin || isStaff) ? NotificationType.ADMIN_SYSTEM : NotificationType.SYSTEM;

            notificationService.sendNotification(user, "Đổi mật khẩu thành công", "Mật khẩu của tài khoản " + userName + " đã được đặt lại thành công.", "/home", notifType);

            return ResponseEntity.ok(Map.of("message", "Đổi mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới."));
    }

    /**
     * Endpoint: POST /api/auth/upload-avatar
     */
    @PostMapping("/upload-avatar")
    public ResponseEntity<?> uploadAvatar(
            @RequestParam("file") MultipartFile file,
            @CookieValue(value = "accessToken", required = false) String cookieToken,
            HttpServletRequest request) {
        String token = resolveToken(cookieToken, request);
        if (token == null || token.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Vui lòng đăng nhập để tải lên ảnh đại diện"));
        }

            String email = jwtUtil.extractEmail(token);
            if (email == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại"));
            }

            User user = userService.findByEmail(email);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Không tìm thấy người dùng"));
            }

            // Sử dụng forwarded header (Railway/Vercel proxy đều gửi header này):
            String scheme = request.getHeader("X-Forwarded-Proto");
            if (scheme == null) scheme = request.getScheme();
            String host = request.getHeader("X-Forwarded-Host");
            if (host == null) host = request.getServerName() + ":" + request.getServerPort();
            String serverBaseUrl = scheme + "://" + host;

            String avatarUrl = userService.uploadAvatar(user.getId(), file, serverBaseUrl);
            return ResponseEntity.ok(Map.of("avatarUrl", avatarUrl));
    }

    /**
     * Lấy token từ cookie HOẶC Authorization header (Bearer token).
     * Hỗ trợ cả 2 để tương thích mobile Safari (ITP chặn third-party cookie).
     */
    private String resolveToken(String cookieToken, HttpServletRequest request) {
        if (cookieToken != null && !cookieToken.isBlank()) return cookieToken;
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(
            @CookieValue(value = "accessToken", required = false) String cookieToken,
            HttpServletRequest request) {
        String token = resolveToken(cookieToken, request);
        if (token == null || token.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Vui lòng đăng nhập để xem thông tin cá nhân"));
        }

            String email = jwtUtil.extractEmail(token);
            if (email == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại"));
            }

            User user = userService.findByEmail(email);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", "Không tìm thấy thông tin người dùng"));
            }

            return ResponseEntity.ok(UserResponse.fromEntity(user));
    }

    /**
     * Endpoint: PUT /api/auth/update-profile
     * Cập nhật thông tin cá nhân của user đang đăng nhập (fullName, phoneNumber,
     * dateOfBirth)
     */
    @PutMapping("/update-profile")
    public ResponseEntity<?> updateProfile(
            @CookieValue(value = "accessToken", required = false) String cookieToken,
            HttpServletRequest request,
            @Valid @RequestBody UpdateProfileRequest updateRequest) {
        String token = resolveToken(cookieToken, request);
        if (token == null || token.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Vui lòng đăng nhập để cập nhật thông tin"));
        }

            String email = jwtUtil.extractEmail(token);
            if (email == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại"));
            }

            User updatedUser = userService.updateProfile(email, updateRequest);
            return ResponseEntity.ok(UserResponse.fromEntity(updatedUser));
    }

}