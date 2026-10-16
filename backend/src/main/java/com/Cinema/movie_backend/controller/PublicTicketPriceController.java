package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.DTO.TicketPriceResponse;
import com.Cinema.movie_backend.service.TicketPriceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * REST API public quản lý giá vé cho khách hàng.
 *
 * Base URL: /api/public/ticket-prices
 */
@RestController
@RequestMapping("/api/public/ticket-prices")
@RequiredArgsConstructor
public class PublicTicketPriceController {

    private final TicketPriceService ticketPriceService;

    // ────────────────────────────────────────────────
    // GET /api/public/ticket-prices
    // ────────────────────────────────────────────────
    @GetMapping
    public ResponseEntity<?> getActiveTicketPrices() {
        try {
            List<TicketPriceResponse> list = ticketPriceService.getActiveTicketPrices();
            return ResponseEntity.ok(list);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Lỗi lấy danh sách giá vé: " + e.getMessage()));
        }
    }
}
