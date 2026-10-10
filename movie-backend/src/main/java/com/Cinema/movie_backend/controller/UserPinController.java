package com.Cinema.movie_backend.controller;


import com.Cinema.movie_backend.service.UserPinSecurityService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.Cinema.movie_backend.util.JwtUtil;
import org.springframework.http.HttpStatus;

import java.util.Map;

@RestController
@RequestMapping("/api/users/pin")
@RequiredArgsConstructor
public class UserPinController {

    private final UserPinSecurityService pinService;
    private final JwtUtil jwtUtil;
    private final com.Cinema.movie_backend.service.SecurityActivityService securityActivityService;

    @GetMapping("/status")
    public ResponseEntity<?> checkPinStatus(@CookieValue(value = "accessToken", required = false) String token) {
        if (token == null || token.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Vui lòng đăng nhập"));
        }
        try {
            String email = jwtUtil.extractEmail(token);
            boolean hasPin = pinService.hasPinSetup(email);
            return ResponseEntity.ok(Map.of("hasPinSetup", hasPin));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/setup")
    public ResponseEntity<?> setupPin(@CookieValue(value = "accessToken", required = false) String token, @RequestBody Map<String, String> payload, jakarta.servlet.http.HttpServletRequest request) {
        if (token == null || token.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Vui lòng đăng nhập"));
        }
        try {
            String email = jwtUtil.extractEmail(token);
            pinService.setupPin(email, payload.get("newPin"), payload.get("confirmPin"));

            String deviceId = request.getHeader("X-Device-Id");
            securityActivityService.logActivityByEmail(email, com.Cinema.movie_backend.entity.SecurityActionType.PIN_SETUP, request, deviceId);

            return ResponseEntity.ok(Map.of("message", "Thiết lập mã PIN thành công."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/forgot")
    public ResponseEntity<?> forgotPin(@RequestBody Map<String, String> payload) {
        try {
            pinService.requestForgotPin(payload.get("email"));
            return ResponseEntity.ok(Map.of("message", "OTP đã được gửi đến email của bạn."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/reset")
    public ResponseEntity<?> resetPin(@RequestBody Map<String, String> payload, jakarta.servlet.http.HttpServletRequest request) {
        try {
            String email = payload.get("email");
            pinService.resetPin(
                    email,
                    payload.get("otp"),
                    payload.get("newPin"),
                    payload.get("confirmPin")
            );
            String deviceId = request.getHeader("X-Device-Id");
            securityActivityService.logActivityByEmail(email, com.Cinema.movie_backend.entity.SecurityActionType.PIN_CHANGED, request, deviceId);
            return ResponseEntity.ok(Map.of("message", "Đặt lại mã PIN thành công."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/request-change-otp")
    public ResponseEntity<?> requestChangeOtp(@CookieValue(value = "accessToken", required = false) String token) {
        if (token == null || token.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Vui lòng đăng nhập"));
        }
        try {
            String email = jwtUtil.extractEmail(token);
            pinService.requestForgotPin(email); // Reuses the PIN_RESET OTP type
            return ResponseEntity.ok(Map.of("message", "OTP đã được gửi đến email của bạn."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/change")
    public ResponseEntity<?> changePin(@CookieValue(value = "accessToken", required = false) String token, @RequestBody Map<String, String> payload, jakarta.servlet.http.HttpServletRequest request) {
        if (token == null || token.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Vui lòng đăng nhập"));
        }
        try {
            String email = jwtUtil.extractEmail(token);
            pinService.changePin(
                    email,
                    payload.get("otp"),
                    payload.get("oldPin"),
                    payload.get("newPin"),
                    payload.get("confirmPin")
            );
            String deviceId = request.getHeader("X-Device-Id");
            securityActivityService.logActivityByEmail(email, com.Cinema.movie_backend.entity.SecurityActionType.PIN_CHANGED, request, deviceId);
            return ResponseEntity.ok(Map.of("message", "Đổi mã PIN thành công."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verifyPin(@CookieValue(value = "accessToken", required = false) String token, @RequestBody Map<String, String> payload) {
        if (token == null || token.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Vui lòng đăng nhập"));
        }
        try {
            String email = jwtUtil.extractEmail(token);
            boolean isValid = pinService.verifyPin(email, payload.get("pin"));
            if (isValid) {
                return ResponseEntity.ok(Map.of("message", "Mã PIN hợp lệ"));
            } else {
                return ResponseEntity.badRequest().body(Map.of("message", "Mã PIN hiện tại không chính xác"));
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@CookieValue(value = "accessToken", required = false) String token, @RequestBody Map<String, String> payload) {
        if (token == null || token.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Vui lòng đăng nhập"));
        }
        try {
            String email = jwtUtil.extractEmail(token);
            boolean isValid = pinService.verifyOtp(email, payload.get("otp"));
            if (isValid) {
                return ResponseEntity.ok(Map.of("message", "Mã OTP hợp lệ"));
            } else {
                return ResponseEntity.badRequest().body(Map.of("message", "Mã OTP không chính xác hoặc đã hết hạn"));
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
