package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/contact")
public class ContactController {

    @Autowired
    private EmailService emailService;

    @PostMapping("/send")
    public ResponseEntity<?> sendContactEmail(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        String email = body.get("email");
        String phone = body.getOrDefault("phone", "");
        String message = body.get("message");

        // Validate required fields
        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Vui lòng nhập họ tên."));
        }
        if (email == null || !email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Địa chỉ email không hợp lệ."));
        }
        if (message == null || message.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Vui lòng nhập nội dung liên hệ."));
        }

        try {
            emailService.sendContactFormEmail(name.trim(), email.trim(), phone.trim(), message.trim());
            return ResponseEntity.ok(Map.of("message", "Gửi thành công! Chúng tôi sẽ phản hồi sớm nhất có thể."));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", "Gửi thất bại, vui lòng thử lại sau."));
        }
    }
}
