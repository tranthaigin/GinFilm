package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.DTO.MovieShowtimeDto;
import com.Cinema.movie_backend.DTO.ShowtimeSeatResponse;
import com.Cinema.movie_backend.service.ShowtimeService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class ShowtimeController {

    private final ShowtimeService showtimeService;

    /**
     * GET /api/theaters/{theaterId}/showtimes?date=yyyy-MM-dd
     * Lấy danh sách phim + suất chiếu theo rạp và ngày (dùng ở CinemasPage).
     */
    @GetMapping("/api/theaters/{theaterId}/showtimes")
    public ResponseEntity<?> getShowtimesByTheaterAndDate(
            @PathVariable Long theaterId,
            @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        try {
            List<MovieShowtimeDto> showtimes = showtimeService.getShowtimesByTheaterAndDate(theaterId, date);
            return ResponseEntity.ok(showtimes);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Không thể tải danh sách suất chiếu: " + e.getMessage()));
        }
    }

    /**
     * GET /api/shows/{showtimeId}/seats
     * Lấy thông tin suất chiếu + sơ đồ ghế thực tế của phòng (do admin thiết kế).
     * Dùng cho trang chọn ghế của user (BookingPage).
     */
    @GetMapping("/api/shows/{showtimeId}/seats")
    public ResponseEntity<?> getShowtimeWithSeats(@PathVariable Long showtimeId) {
        try {
            ShowtimeSeatResponse response = showtimeService.getShowtimeWithSeats(showtimeId);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(404)
                    .body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Không thể tải thông tin suất chiếu: " + e.getMessage()));
        }
    }
}
