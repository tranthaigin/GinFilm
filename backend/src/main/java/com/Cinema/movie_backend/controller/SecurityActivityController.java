package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.entity.SecurityActivityLog;
import com.Cinema.movie_backend.service.SecurityActivityService;
import com.Cinema.movie_backend.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class SecurityActivityController {

    private final SecurityActivityService securityActivityService;
    private final JwtUtil jwtUtil;
    private final com.Cinema.movie_backend.repository.UserRepository userRepository;

    @GetMapping("/users/security-activities")
    public ResponseEntity<?> getUserActivities(
            @CookieValue(value = "accessToken", required = false) String token,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        if (token == null || token.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Vui lòng đăng nhập"));
        }

        try {
            String email = jwtUtil.extractEmail(token);
            if (email == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Token không hợp lệ"));
            }
            
            com.Cinema.movie_backend.entity.User user = userRepository.findByEmailManual(email).orElse(null);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "User không tồn tại"));
            }

            Pageable pageable = PageRequest.of(page, size);
            Page<SecurityActivityLog> logs = securityActivityService.getUserActivities(user.getId(), pageable);
            return ResponseEntity.ok(logs);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/admin/security-activities")
    public ResponseEntity<?> getAllActivities(
            @CookieValue(value = "accessToken", required = false) String token,
            @RequestParam(required = false) String role,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        if (token == null || token.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Vui lòng đăng nhập"));
        }

        try {
            String email = jwtUtil.extractEmail(token);
            com.Cinema.movie_backend.entity.User user = userRepository.findByEmailManual(email).orElse(null);
            
            if (user == null || user.getRoles().stream().noneMatch(r -> r.getName().toUpperCase().contains("ADMIN") || r.getName().toUpperCase().contains("STAFF"))) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Không có quyền truy cập"));
            }

            Pageable pageable = PageRequest.of(page, size);
            Page<SecurityActivityLog> logs = securityActivityService.getAllActivities(role, pageable);
            return ResponseEntity.ok(logs);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", e.getMessage()));
        }
    }
}
