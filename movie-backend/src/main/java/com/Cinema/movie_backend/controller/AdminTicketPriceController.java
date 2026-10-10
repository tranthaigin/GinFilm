package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.DTO.TicketPriceRequest;
import com.Cinema.movie_backend.DTO.TicketPriceResponse;
import com.Cinema.movie_backend.enums.AudienceType;
import com.Cinema.movie_backend.enums.DayType;
import com.Cinema.movie_backend.enums.RoomType;
import com.Cinema.movie_backend.enums.SeatType;
import com.Cinema.movie_backend.enums.TicketPriceStatus;
import com.Cinema.movie_backend.service.TicketPriceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST API quản lý giá vé – Admin.
 *
 * Base URL: /api/admin/ticket-prices
 */
@RestController
@RequestMapping("/api/admin/ticket-prices")
@RequiredArgsConstructor
public class AdminTicketPriceController {

    private final TicketPriceService ticketPriceService;

    // ────────────────────────────────────────────────
    // GET /api/admin/ticket-prices
    // ────────────────────────────────────────────────
    @GetMapping
    public ResponseEntity<?> getAllTicketPrices() {
        try {
            List<TicketPriceResponse> list = ticketPriceService.getAllTicketPrices();
            return ResponseEntity.ok(list);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Lỗi lấy danh sách giá vé: " + e.getMessage()));
        }
    }

    // ────────────────────────────────────────────────
    // GET /api/admin/ticket-prices/{id}
    // ────────────────────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<?> getTicketPriceById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(ticketPriceService.getById(id));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Không tìm thấy giá vé: " + e.getMessage()));
        }
    }

    // ────────────────────────────────────────────────
    // POST /api/admin/ticket-prices
    // ────────────────────────────────────────────────
    @PostMapping
    public ResponseEntity<?> createTicketPrice(@RequestBody TicketPriceRequest request) {
        try {
            TicketPriceResponse response = ticketPriceService.createTicketPrice(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Lỗi tạo giá vé: " + e.getMessage()));
        }
    }

    // ────────────────────────────────────────────────
    // PUT /api/admin/ticket-prices/{id}
    // ────────────────────────────────────────────────
    @PutMapping("/{id}")
    public ResponseEntity<?> updateTicketPrice(
            @PathVariable Long id,
            @RequestBody TicketPriceRequest request) {
        try {
            TicketPriceResponse response = ticketPriceService.updateTicketPrice(id, request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Lỗi cập nhật giá vé: " + e.getMessage()));
        }
    }

    // ────────────────────────────────────────────────
    // PATCH /api/admin/ticket-prices/{id}/status
    // Body: { "status": "ACTIVE" | "INACTIVE" | "HIDDEN" }
    // ────────────────────────────────────────────────
    @PatchMapping("/{id}/status")
    public ResponseEntity<?> changeStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        try {
            TicketPriceStatus newStatus = TicketPriceStatus.valueOf(body.get("status"));
            TicketPriceResponse response = ticketPriceService.changeStatus(id, newStatus);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Giá trị status không hợp lệ. Dùng: ACTIVE, INACTIVE, HIDDEN"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Lỗi cập nhật trạng thái: " + e.getMessage()));
        }
    }

    // ────────────────────────────────────────────────
    // DELETE /api/admin/ticket-prices/{id}
    // ────────────────────────────────────────────────
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTicketPrice(@PathVariable Long id) {
        try {
            ticketPriceService.deleteTicketPrice(id);
            return ResponseEntity.ok(Map.of("message", "Đã xóa giá vé thành công"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Lỗi xóa giá vé: " + e.getMessage()));
        }
    }

    // ────────────────────────────────────────────────
    // GET /api/admin/ticket-prices/lookup
    //   ?audienceType=ADULT&seatType=NORMAL&roomType=LO_RAP&dayType=WEEKDAY
    // ────────────────────────────────────────────────
    @GetMapping("/lookup")
    public ResponseEntity<?> lookupPrice(
            @RequestParam AudienceType audienceType,
            @RequestParam SeatType seatType,
            @RequestParam RoomType roomType,
            @RequestParam DayType dayType) {
        try {
            return ticketPriceService.lookupPrice(audienceType, seatType, roomType, dayType)
                    .<ResponseEntity<?>>map(ResponseEntity::ok)
                    .orElseGet(() -> ResponseEntity.ok(Map.of("message", "Không tìm thấy giá vé phù hợp")));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Lỗi tra cứu giá vé: " + e.getMessage()));
        }
    }
}
