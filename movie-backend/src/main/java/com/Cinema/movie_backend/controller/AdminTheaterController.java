package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.DTO.TheaterRequest;
import com.Cinema.movie_backend.DTO.TheaterResponse;
import com.Cinema.movie_backend.service.TheaterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/theaters")
@RequiredArgsConstructor
public class AdminTheaterController {

    private final TheaterService theaterService;

    /**
     * POST /api/admin/theaters
     */
    @PostMapping
    public ResponseEntity<?> createTheater(@RequestBody TheaterRequest request) {
        try {
            TheaterResponse response = theaterService.createTheater(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Lỗi tạo rạp chiếu: " + e.getMessage()));
        }
    }

    /**
     * PUT /api/admin/theaters/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateTheater(@PathVariable Long id, @RequestBody TheaterRequest request) {
        try {
            TheaterResponse response = theaterService.updateTheater(id, request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Lỗi cập nhật rạp chiếu: " + e.getMessage()));
        }
    }

    /**
     * PATCH /api/admin/theaters/{id}/toggle-active
     */
    @PatchMapping("/{id}/toggle-active")
    public ResponseEntity<?> toggleTheaterStatus(@PathVariable Long id) {
        try {
            TheaterResponse response = theaterService.toggleTheaterStatus(id);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Lỗi cập nhật trạng thái rạp chiếu: " + e.getMessage()));
        }
    }
}
