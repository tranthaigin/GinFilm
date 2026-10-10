package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.DTO.NotificationResponse;
import com.Cinema.movie_backend.entity.User;
import com.Cinema.movie_backend.service.NotificationService;
import com.Cinema.movie_backend.service.UserService;
import com.Cinema.movie_backend.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final UserService userService;
    private final JwtUtil jwtUtil;

    private User getUserFromToken(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        try {
            String email = jwtUtil.extractEmail(token);
            if (email != null) {
                return userService.findByEmail(email);
            }
        } catch (Exception e) {
            return null;
        }
        return null;
    }

    @GetMapping
    public ResponseEntity<?> getUserNotifications(@CookieValue(value = "accessToken", required = false) String token) {
        User user = getUserFromToken(token);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Token không hợp lệ"));
        }
        return ResponseEntity.ok(notificationService.getUserNotifications(user));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable UUID id, @CookieValue(value = "accessToken", required = false) String token) {
        User user = getUserFromToken(token);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Token không hợp lệ"));
        }
        notificationService.markAsRead(id, user);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/read-all")
    public ResponseEntity<?> markAllAsRead(@CookieValue(value = "accessToken", required = false) String token) {
        User user = getUserFromToken(token);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Token không hợp lệ"));
        }
        notificationService.markAllAsRead(user);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/remind-review")
    public ResponseEntity<?> remindReview(
            @CookieValue(value = "accessToken", required = false) String token,
            @RequestBody Map<String, String> payload) {
        User user = getUserFromToken(token);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Token không hợp lệ"));
        }

        String movieTitle = payload.get("movieTitle");

        String title = "Nhắc nhở đánh giá phim";
        String message = "Bạn vừa xem phim " + (movieTitle != null && !movieTitle.isEmpty() ? "\"" + movieTitle + "\" " : "") + "xong, đừng quên để lại đánh giá nhé!";
        
        notificationService.sendNotification(
                user,
                title,
                message,
                (String) null,
                com.Cinema.movie_backend.entity.NotificationType.SYSTEM
        );
        return ResponseEntity.ok().build();
    }
}
