package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.DTO.ProvinceResponse;
import com.Cinema.movie_backend.DTO.TheaterResponse;
import com.Cinema.movie_backend.service.ProvinceService;
import com.Cinema.movie_backend.DTO.RoomResponse;
import com.Cinema.movie_backend.service.RoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class ProvinceController {

    private final ProvinceService provinceService;
    private final RoomService roomService;

    /**
     * GET /api/provinces
     */
    @GetMapping("/api/provinces")
    public ResponseEntity<?> getProvincesWithTheaters() {
        try {
            List<ProvinceResponse> provinces = provinceService.getAllProvincesWithTheaters();
            return ResponseEntity.ok(provinces);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Không thể tải danh sách tỉnh/thành: " + e.getMessage()));
        }
    }

    /**
     * GET /api/provinces/all
     */
    @GetMapping("/api/provinces/all")
    public ResponseEntity<?> getAllProvinces() {
        try {
            List<ProvinceResponse> provinces = provinceService.getAllProvinces();
            return ResponseEntity.ok(provinces);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Không thể tải danh sách tỉnh/thành: " + e.getMessage()));
        }
    }

    /**
     * GET /api/provinces/{provinceId}/theaters
     */
    @GetMapping("/api/provinces/{provinceId}/theaters")
    public ResponseEntity<?> getTheatersByProvince(@PathVariable Long provinceId) {
        try {
            List<TheaterResponse> theaters = provinceService.getTheatersByProvince(provinceId);
            return ResponseEntity.ok(theaters);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Không thể tải danh sách rạp: " + e.getMessage()));
        }
    }

    /**
     * GET /api/theaters
     */
    @GetMapping("/api/theaters")
    public ResponseEntity<?> getAllTheaters() {
        try {
            List<TheaterResponse> theaters = provinceService.getAllTheaters();
            return ResponseEntity.ok(theaters);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Không thể tải danh sách rạp: " + e.getMessage()));
        }
    }

    /**
     * GET /api/theaters/{theaterId}/rooms
     */
    @GetMapping("/api/theaters/{theaterId}/rooms")
    public ResponseEntity<?> getRoomsByTheater(@PathVariable Long theaterId) {
        try {
            List<RoomResponse> rooms = roomService.getRoomsByTheater(theaterId);
            return ResponseEntity.ok(rooms);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Không thể tải danh sách phòng chiếu: " + e.getMessage()));
        }
    }
}
