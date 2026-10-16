package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.DTO.AdminUpdateUserRequest;
import com.Cinema.movie_backend.DTO.StaffCreateUserRequest;
import com.Cinema.movie_backend.DTO.UserResponse;
import com.Cinema.movie_backend.entity.User;
import com.Cinema.movie_backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Controller dành riêng cho Staff để quản lý tài khoản User (khách hàng).
 * Staff có thể: xem danh sách, tạo mới, cập nhật, khoá/mở khoá tài khoản.
 */
@RestController
@RequestMapping("/api/staff/customers")
@RequiredArgsConstructor
public class StaffUserController {

    private final UserService userService;

    /**
     * GET /api/staff/customers
     * Lấy danh sách tất cả khách hàng đang hoạt động.
     */
    @GetMapping
    public ResponseEntity<List<UserResponse>> getCustomers() {
        List<User> customers = userService.getCustomers();
        List<UserResponse> response = customers.stream()
                .map(UserResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/staff/customers/locked
     * Lấy danh sách khách hàng đã bị khoá hoặc xoá.
     */
    @GetMapping("/locked")
    public ResponseEntity<List<UserResponse>> getLockedCustomers() {
        List<User> lockedCustomers = userService.getDeletedCustomers();
        List<UserResponse> response = lockedCustomers.stream()
                .map(UserResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/staff/customers
     * Tạo tài khoản user mới thay mặt khách hàng.
     * Tài khoản được kích hoạt ngay (ACTIVE), không cần xác thực OTP qua email.
     */
    @PostMapping
    public ResponseEntity<?> createCustomer(@RequestBody StaffCreateUserRequest request) {
        try {
            User newUser = userService.createUserByStaff(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(UserResponse.fromEntity(newUser));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * PUT /api/staff/customers/{id}
     * Cập nhật thông tin khách hàng (email, số điện thoại, trạng thái).
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateCustomer(@PathVariable UUID id,
                                            @RequestBody AdminUpdateUserRequest request) {
        try {
            User updatedUser = userService.updateUserByAdmin(id, request);
            return ResponseEntity.ok(UserResponse.fromEntity(updatedUser));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * PUT /api/staff/customers/{id}/toggle-lock
     * Khoá hoặc mở khoá tài khoản khách hàng.
     */
    @PutMapping("/{id}/toggle-lock")
    public ResponseEntity<?> toggleLock(@PathVariable UUID id) {
        try {
            User user = userService.toggleUserLockStatus(id);
            boolean isLocked = user.getStatus().name().equals("LOCKED");
            String message = isLocked ? "Đã khoá tài khoản thành công!" : "Đã mở khoá tài khoản thành công!";
            return ResponseEntity.ok(Map.of("message", message, "user", UserResponse.fromEntity(user)));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }
}
