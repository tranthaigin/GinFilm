package com.Cinema.movie_backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Health check endpoint dùng cho Railway deployment monitoring.
 * Railway sẽ ping /api/public/health để kiểm tra service còn sống không.
 */
@RestController
@RequestMapping("/api/public")
public class HealthController {

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "GinFilm Backend",
                "timestamp", LocalDateTime.now().toString()
        ));
    }
}
