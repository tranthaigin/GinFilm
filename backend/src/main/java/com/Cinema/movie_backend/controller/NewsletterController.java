package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/newsletter")
public class NewsletterController {

    @Autowired
    private EmailService emailService;

    // POST /api/newsletter/subscribe
    @PostMapping("/subscribe")
    public ResponseEntity<?> subscribe(@RequestBody Map<String, String> body) {
        String email = body.get("email");

        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email không được để trống."));
        }

        if (!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Địa chỉ email không hợp lệ."));
        }

        // Send notification email to system mailbox (no DB)
        emailService.sendNewsletterNotification(email);

        return ResponseEntity.ok(Map.of("message", "Đăng ký thành công! Cảm ơn bạn đã theo dõi GinFilm."));
    }
}
