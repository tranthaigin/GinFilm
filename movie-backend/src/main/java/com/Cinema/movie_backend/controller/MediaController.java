package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.entity.OnlineTicket;
import com.Cinema.movie_backend.repository.OnlineTicketRepository;
import com.Cinema.movie_backend.service.S3MediaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/media")
@RequiredArgsConstructor
public class MediaController {

    private final S3MediaService s3MediaService;
    private final OnlineTicketRepository ticketRepository;

    @GetMapping("/stream")
    public ResponseEntity<?> streamMedia(@RequestParam String key, @RequestParam(required = false) String ticketCode) {
        if (key == null || key.isBlank()) {
            return ResponseEntity.badRequest().body("Key is required");
        }

        String targetUrl = null;

        // Nếu là trailer, phát công khai không cần vé
        if (key.startsWith("trailer/")) {
            targetUrl = s3MediaService.getPublicUrl(key);
        } 
        // Nếu là phim gốc (nằm trong thư mục movie/ hoặc khác), yêu cầu kiểm tra vé
        else {
            if (ticketCode == null || ticketCode.isBlank()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Missing ticketCode for private content");
            }

            OnlineTicket ticket = ticketRepository.findByTicketCode(ticketCode).orElse(null);
            if (ticket == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Invalid ticket");
            }

            // Kiểm tra hạn sử dụng của vé
            if (ticket.getExpiresAt() != null && ticket.getExpiresAt().isBefore(LocalDateTime.now())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Ticket expired");
            }

            // Sinh link tạm thời 15 phút (đã cấu hình presign-ttl-seconds)
            targetUrl = s3MediaService.generatePresignedUrl(key);
        }

        if (targetUrl == null) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Could not generate media URL");
        }

        // Redirect 302 (Found) tới URL của AWS S3
        // Loại bỏ các header no-cache, no-store vì chúng có thể gây lỗi 
        // cho trình duyệt khi thực hiện Range requests (tìm luồng Audio/Video)
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(targetUrl))
                .build();
    }
}
