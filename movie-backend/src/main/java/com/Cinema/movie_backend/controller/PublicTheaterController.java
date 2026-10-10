package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.DTO.TheaterResponse;
import com.Cinema.movie_backend.service.TheaterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 *  - Lấy danh sách tất cả rạp đang hoạt động
 *  - Xem thông tin chi tiết của một rạp
 */
@RestController
@RequestMapping("/api/theaters")
@RequiredArgsConstructor
public class PublicTheaterController {

    private final TheaterService theaterService;

    /**
     * GET /api/theaters/active
     */
    @GetMapping("/active")
    public ResponseEntity<?> getAllActiveTheaters() {
        try {
            List<TheaterResponse> theaters = theaterService.getAllActiveTheaters();
            return ResponseEntity.ok(theaters);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Không thể tải danh sách rạp: " + e.getMessage()));
        }
    }

    /**
     * GET /api/theaters/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getTheaterById(@PathVariable Long id) {
        try {
            TheaterResponse response = theaterService.getTheaterById(id);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(404)
                    .body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Không thể tải thông tin rạp: " + e.getMessage()));
        }
    }
}
