package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.DTO.ShowtimeCreateRequest;
import com.Cinema.movie_backend.DTO.ShowtimeUpdateRequest;
import com.Cinema.movie_backend.DTO.AdminShowtimeDto;
import com.Cinema.movie_backend.service.ShowtimeService;
import com.Cinema.movie_backend.repository.MovieRepository;
import com.Cinema.movie_backend.entity.Movie;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/showtimes")
@RequiredArgsConstructor
public class AdminShowtimeController {

    private final ShowtimeService showtimeService;
    private final MovieRepository movieRepository;

    @GetMapping
    public ResponseEntity<?> getAllShowtimes(
            @RequestParam(required = false) Long theaterId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) java.time.LocalDate date) {
        try {
            List<AdminShowtimeDto> showtimes = showtimeService.getAllAdminShowtimes(theaterId, date);
            return ResponseEntity.ok(showtimes);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Lỗi lấy danh sách suất chiếu: " + e.getMessage()));
        }
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchShowtimes(
            @RequestParam(required = false) Long theaterId,
            @RequestParam(required = false) Long movieId,
            @RequestParam(required = false) Long roomId,
            @RequestParam(required = false) String genre,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) java.time.LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) java.time.LocalDate endDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) java.time.LocalTime startTime,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) java.time.LocalTime endTime,
            @RequestParam(required = false) String format,
            @RequestParam(required = false, defaultValue = "active") String statusTab,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "7") int size) {
        try {
            org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size,
                    org.springframework.data.domain.Sort.by("showDate").ascending().and(org.springframework.data.domain.Sort.by("startTime").ascending()));
            org.springframework.data.domain.Page<AdminShowtimeDto> showtimesPage = showtimeService.searchShowtimes(
                    theaterId, movieId, roomId, genre, startDate, endDate, startTime, endTime, format, statusTab, pageable);
            return ResponseEntity.ok(showtimesPage);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Lỗi tìm kiếm suất chiếu: " + e.getMessage()));
        }
    }

    @GetMapping("/date-range")
    public ResponseEntity<?> getShowtimesByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) java.time.LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) java.time.LocalDate endDate) {
        try {
            List<AdminShowtimeDto> showtimes = showtimeService.getShowtimesByDateRange(startDate, endDate);
            return ResponseEntity.ok(showtimes);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Lỗi lấy danh sách suất chiếu theo ngày: " + e.getMessage()));
        }
    }

    @PostMapping("/batch")
    public ResponseEntity<?> createBatchShowtimes(@RequestBody List<ShowtimeCreateRequest> requests) {
        try {
            for (ShowtimeCreateRequest req : requests) {
                Movie movie = movieRepository.findById(req.getMovieId()).orElse(null);
                if (movie == null) {
                    return ResponseEntity.badRequest().body(Map.of("message", "Phim không tồn tại."));
                }
                if (Boolean.FALSE.equals(movie.getIsCinemaAvailable()) || 
                    (!movie.getStatus().equalsIgnoreCase("NOW_SHOWING") 
                     && !movie.getStatus().equalsIgnoreCase("showing")
                     && !movie.getStatus().equalsIgnoreCase("COMING_SOON")
                     && !movie.getStatus().equalsIgnoreCase("UPCOMING"))) {
                    return ResponseEntity.badRequest().body(Map.of("message", "Chỉ có thể tạo suất chiếu cho phim Đang chiếu hoặc Sắp chiếu."));
                }
            }
            showtimeService.createBatchShowtimes(requests);
            return ResponseEntity.ok(Map.of("message", "Đã lưu " + requests.size() + " suất chiếu thành công"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Lỗi lưu suất chiếu: " + e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> createShowtime(@RequestBody ShowtimeCreateRequest request) {
        try {
            Movie movie = movieRepository.findById(request.getMovieId()).orElse(null);
            if (movie == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "Phim không tồn tại."));
            }
            if (Boolean.FALSE.equals(movie.getIsCinemaAvailable()) || 
                (!movie.getStatus().equalsIgnoreCase("NOW_SHOWING") 
                 && !movie.getStatus().equalsIgnoreCase("showing")
                 && !movie.getStatus().equalsIgnoreCase("COMING_SOON")
                 && !movie.getStatus().equalsIgnoreCase("UPCOMING"))) {
                return ResponseEntity.badRequest().body(Map.of("message", "Chỉ có thể tạo suất chiếu cho phim Đang chiếu hoặc Sắp chiếu."));
            }
            showtimeService.createBatchShowtimes(java.util.Collections.singletonList(request));
            return ResponseEntity.ok(Map.of("message", "Đã lưu suất chiếu thành công"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Lỗi lưu suất chiếu: " + e.getMessage()));
        }
    }

    @DeleteMapping("/all")
    public ResponseEntity<?> deleteAllShowtimes() {
        try {
            showtimeService.deleteAllShowtimes();
            return ResponseEntity.ok(Map.of("message", "Đã xóa toàn bộ suất chiếu thành công"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Lỗi khi xóa suất chiếu: " + e.getMessage()));
        }
    }

    @DeleteMapping("/drafts")
    public ResponseEntity<?> deleteDrafts() {
        try {
            showtimeService.deleteDrafts();
            return ResponseEntity.ok(Map.of("message", "Đã xóa toàn bộ suất chiếu nháp thành công"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Lỗi khi xóa suất chiếu nháp: " + e.getMessage()));
        }
    }

    @PostMapping("/publish-drafts")
    public ResponseEntity<?> publishDrafts() {
        try {
            showtimeService.publishDrafts();
            return ResponseEntity.ok(Map.of("message", "Đã lưu bản nháp thành công"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Lỗi khi lưu bản nháp: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}/format")
    public ResponseEntity<?> updateFormat(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        try {
            String newFormat = payload.get("format");
            if (newFormat == null || newFormat.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Format không được để trống"));
            }
            showtimeService.updateShowtimeFormat(id, newFormat);
            return ResponseEntity.ok(Map.of("message", "Cập nhật định dạng thành công"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Lỗi cập nhật: " + e.getMessage()));

        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateShowtime(@PathVariable Long id, @RequestBody ShowtimeUpdateRequest request) {
        try {
            AdminShowtimeDto updated = showtimeService.updateShowtime(id, request);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Lỗi cập nhật suất chiếu: " + e.getMessage()));
        }
    }

    @PatchMapping("/{id}/toggle-visibility")
    public ResponseEntity<?> toggleShowtimeVisibility(@PathVariable Long id) {
        try {
            com.Cinema.movie_backend.entity.Showtime showtime = showtimeService.toggleShowtimeVisibility(id);
            String message = showtime.getIsHidden() ? "Ẩn suất chiếu thành công" : "Hiện suất chiếu thành công";
            return ResponseEntity.ok(Map.of(
                    "message", message,
                    "isHidden", showtime.getIsHidden()
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Lỗi khi cập nhật trạng thái suất chiếu: " + e.getMessage()));
        }
    }
}
