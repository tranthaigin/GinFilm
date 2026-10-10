package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.service.WatchService;
import com.Cinema.movie_backend.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/watch")
@RequiredArgsConstructor
public class WatchController {

    private final WatchService watchService;
    private final JwtUtil jwtUtil;
    private final SimpMessagingTemplate messagingTemplate;

    private String resolveToken(String cookieToken, jakarta.servlet.http.HttpServletRequest request) {
        if (cookieToken != null && !cookieToken.isBlank()) {
            return cookieToken;
        }
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }

    @PostMapping("/sync")
    public ResponseEntity<?> syncProgress(
            @CookieValue(value = "accessToken", required = false) String token,
            jakarta.servlet.http.HttpServletRequest request,
            @RequestBody Map<String, Object> payload) {

        String actualToken = resolveToken(token, request);
        if (actualToken == null || actualToken.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Vui lòng đăng nhập"));
        }

        try {
            String email = jwtUtil.extractEmail(actualToken);

            String ticketCode = payload.get("ticketCode") != null ? payload.get("ticketCode").toString() : null;
            if (payload.get("movieId") == null) throw new IllegalArgumentException("Thiếu movieId");
            Long movieId = Long.valueOf(payload.get("movieId").toString());
            Integer currentPosition = payload.get("currentPosition") != null ? Integer.valueOf(payload.get("currentPosition").toString()) : 0;
            Integer elapsedSeconds = payload.get("elapsedSeconds") != null ? Integer.valueOf(payload.get("elapsedSeconds").toString()) : 0;

            watchService.syncWatchProgress(email, ticketCode, movieId, currentPosition, elapsedSeconds);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (io.jsonwebtoken.JwtException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Token không hợp lệ hoặc đã hết hạn"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/history/{movieId}")
    public ResponseEntity<?> getHistory(
            @CookieValue(value = "accessToken", required = false) String tokenAuth,
            jakarta.servlet.http.HttpServletRequest request,
            @PathVariable Long movieId,
            @RequestParam(required = false) String ticketCode) {

        String actualToken = resolveToken(tokenAuth, request);
        if (actualToken == null || actualToken.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Vui lòng đăng nhập"));
        }

        try {
            String email = jwtUtil.extractEmail(actualToken);

            Map<String, Object> result = watchService.getWatchProgress(email, movieId, ticketCode);
            return ResponseEntity.ok(result);
        } catch (io.jsonwebtoken.JwtException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Token không hợp lệ hoặc đã hết hạn"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/status")
    public ResponseEntity<?> updateStatus(
            @CookieValue(value = "accessToken", required = false) String tokenAuth,
            jakarta.servlet.http.HttpServletRequest request,
            @RequestBody Map<String, Object> payload) {

        String actualToken = resolveToken(tokenAuth, request);
        if (actualToken == null || actualToken.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Vui lòng đăng nhập"));
        }

        try {
            String email = jwtUtil.extractEmail(actualToken);

            String ticketCode = payload.get("ticketCode") != null ? payload.get("ticketCode").toString() : null;
            Boolean isPlaying = payload.get("isPlaying") != null ? Boolean.valueOf(payload.get("isPlaying").toString()) : false;
            Integer currentPosition = payload.containsKey("currentPosition") && payload.get("currentPosition") != null ? Integer.valueOf(payload.get("currentPosition").toString()) : 0;

            if (ticketCode == null || ticketCode.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Thiếu mã vé (ticketCode)"));
            }

            com.Cinema.movie_backend.entity.OnlineTicket ticket = watchService.updatePlayStatus(email, ticketCode,
                    isPlaying);

            if (ticket != null) {
                // Broadcast to admin WS
                Object wsPayload = Map.of(
                        "ticketId", ticket.getId(),
                        "isPlaying", isPlaying,
                        "watchPosition", currentPosition,
                        "consumedTimeSeconds", ticket.getConsumedTimeSeconds());
                messagingTemplate.convertAndSend("/topic/admin/tickets", wsPayload);
            }

            return ResponseEntity.ok(Map.of("success", true));
        } catch (io.jsonwebtoken.JwtException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Token không hợp lệ hoặc đã hết hạn"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
