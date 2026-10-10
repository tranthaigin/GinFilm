package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.DTO.RoomRequest;
import com.Cinema.movie_backend.DTO.RoomResponse;
import com.Cinema.movie_backend.service.RoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminRoomController {

    private final RoomService roomService;

    /**
     * POST /api/admin/theaters/{theaterId}/rooms
     */
    @PostMapping("/theaters/{theaterId}/rooms")
    public ResponseEntity<?> createRoom(@PathVariable Long theaterId, @RequestBody RoomRequest request) {
        try {
            RoomResponse response = roomService.createRoom(theaterId, request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Lỗi tạo phòng chiếu: " + e.getMessage()));
        }
    }

    /**
     * PUT /api/admin/rooms/{id}
     */
    @PutMapping("/rooms/{id}")
    public ResponseEntity<?> updateRoom(@PathVariable Long id, @RequestBody RoomRequest request) {
        try {
            RoomResponse response = roomService.updateRoom(id, request);
            return ResponseEntity.ok(response);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Không thể cập nhật/xóa ghế vì đã có khách hàng mua vé tại phòng này. Vui lòng giữ nguyên sơ đồ ghế hiện tại."));
        } catch (Exception e) {
            String errorMsg = e.getMessage() != null ? e.getMessage() : "";
            if (errorMsg.contains("foreign key constraint") || errorMsg.contains("DataIntegrityViolationException")) {
                return ResponseEntity.internalServerError()
                        .body(Map.of("message", "Không thể cập nhật/xóa ghế vì đã có khách hàng mua vé tại phòng này. Vui lòng giữ nguyên sơ đồ ghế hiện tại."));
            }
            if (errorMsg.contains("Unexpected row count") || errorMsg.contains("StaleStateException") || errorMsg.contains("OptimisticLockException") || errorMsg.contains("com.Cinema.movie_backend")) {
                return ResponseEntity.internalServerError()
                        .body(Map.of("message", "Lỗi cập nhật phòng chiếu: Dữ liệu đã thay đổi hoặc đang được xử lý, vui lòng tải lại trang và thử lại."));
            }
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Lỗi cập nhật phòng chiếu: " + errorMsg));
        }
    }

    /**
     * PATCH /api/admin/rooms/{id}/toggle-active
     */
    @PatchMapping("/rooms/{id}/toggle-active")
    public ResponseEntity<?> toggleRoomStatus(@PathVariable Long id) {
        try {
            RoomResponse response = roomService.toggleRoomStatus(id);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Lỗi cập nhật trạng thái phòng: " + e.getMessage()));
        }
    }

    /**
     * GET /api/admin/rooms/{id}
     */
    @GetMapping("/rooms/{id}")
    public ResponseEntity<?> getRoomDetails(@PathVariable Long id) {
        try {
            RoomResponse response = roomService.getRoomDetails(id);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Không tìm thấy phòng chiếu: " + e.getMessage()));
        }
    }
}
