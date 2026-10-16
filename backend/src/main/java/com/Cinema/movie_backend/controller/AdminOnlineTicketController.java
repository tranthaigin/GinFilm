package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.entity.OnlineTicket;
import com.Cinema.movie_backend.service.AdminOnlineTicketService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

import com.Cinema.movie_backend.repository.TicketActivationHistoryRepository;

@RestController
@RequestMapping("/api/admin/online-tickets")
@RequiredArgsConstructor
public class AdminOnlineTicketController {

    private final AdminOnlineTicketService adminOnlineTicketService;
    private final TicketActivationHistoryRepository ticketActivationHistoryRepository;

    @GetMapping("/activation-history")
    public ResponseEntity<?> getActivationHistory() {
        return ResponseEntity.ok(ticketActivationHistoryRepository.findAllByOrderByActivatedAtDesc());
    }

    @GetMapping
    public ResponseEntity<List<com.Cinema.movie_backend.DTO.AdminOnlineTicketDto>> getAllOnlineTickets() {
        return ResponseEntity.ok(adminOnlineTicketService.getAllOnlineTickets());
    }

    @GetMapping("/revenue-stats")
    public ResponseEntity<Map<String, Object>> getRevenueStats() {
        return ResponseEntity.ok(adminOnlineTicketService.getRevenueStats());
    }

    @PutMapping("/{id}/ban")
    public ResponseEntity<?> banTicket(@PathVariable Long id, @RequestBody Map<String, Boolean> payload) {
        try {
            boolean isBanned = payload.getOrDefault("isBanned", true);
            adminOnlineTicketService.banTicket(id, isBanned);
            return ResponseEntity.ok(Map.of("message", isBanned ? "Đã cấm vé thành công" : "Đã mở khóa vé thành công"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}/duration")
    public ResponseEntity<?> updateTicketDuration(@PathVariable Long id, @RequestBody Map<String, Integer> payload) {
        try {
            Integer timeLimitMinutes = payload.get("timeLimitMinutes");
            if (timeLimitMinutes == null || timeLimitMinutes <= 0) {
                return ResponseEntity.badRequest().body(Map.of("message", "Thời hạn phải lớn hơn 0"));
            }
            adminOnlineTicketService.updateTicketDuration(id, timeLimitMinutes);
            return ResponseEntity.ok(Map.of("message", "Đã cập nhật thời hạn vé thành công"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}/reset")
    public ResponseEntity<?> resetTicket(@PathVariable Long id) {
        try {
            adminOnlineTicketService.resetTicket(id);
            return ResponseEntity.ok(Map.of("message", "Đã reset vé thành công về trạng thái chưa kích hoạt"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
