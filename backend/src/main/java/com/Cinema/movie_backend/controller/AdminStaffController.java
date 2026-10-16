package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.DTO.StaffCreationRequest;
import com.Cinema.movie_backend.DTO.StaffUpdateRequest;
import com.Cinema.movie_backend.DTO.StaffEmailRequest;
import com.Cinema.movie_backend.entity.User;
import com.Cinema.movie_backend.service.AdminStaffService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;


@RestController
@RequestMapping("/api/admin/staff")
//@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminStaffController {


    private final AdminStaffService adminStaffService;

    /**
     * Lấy danh sách Staff
     */
    @GetMapping
    public ResponseEntity<java.util.List<com.Cinema.movie_backend.DTO.UserResponse>> getStaff() {
        java.util.List<User> staff = adminStaffService.getAllStaff();
        java.util.List<com.Cinema.movie_backend.DTO.UserResponse> response = staff.stream()
                .map(com.Cinema.movie_backend.DTO.UserResponse::fromEntity)
                .collect(java.util.stream.Collectors.toList());
        return ResponseEntity.ok(response);
    }

    /**
     * Thêm tài khoản Staff
     */
    @PostMapping
    public ResponseEntity<?> createStaff(@RequestBody StaffCreationRequest request) {
        try {
            User newStaff = adminStaffService.createStaffAccount(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(newStaff);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    /**
     * Sửa tài khoản Staff
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateStaff(@PathVariable UUID id, @RequestBody StaffUpdateRequest request) {
        try {
            User updatedStaff = adminStaffService.updateStaffAccount(id, request);
            return ResponseEntity.ok(updatedStaff);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    /**
     * Khóa/Mở khóa tài khoản Staff
     */
    @PatchMapping("/{id}/toggle-lock")
    public ResponseEntity<?> toggleStaffLock(@PathVariable UUID id) {
        try {
            User updatedUser = adminStaffService.toggleStaffLockStatus(id);
            String message = updatedUser.getStatus().name().equals("LOCKED") ?
                    "Đã khóa tài khoản thành công!" : "Đã mở khóa tài khoản thành công!";
            return ResponseEntity.ok(message);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    /**
     * Xóa mềm tài khoản Staff
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteStaff(@PathVariable UUID id) {
        try {
            adminStaffService.softDeleteStaff(id);
            return ResponseEntity.ok(java.util.Map.of("message", "Đã xoá nhân viên thành công"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(java.util.Map.of("message", e.getMessage()));
        }
    }

    /**
     * Lấy danh sách Staff đã bị xóa mềm
     */
    @GetMapping("/deleted")
    public ResponseEntity<java.util.List<com.Cinema.movie_backend.DTO.UserResponse>> getDeletedStaff() {
        java.util.List<User> deletedStaff = adminStaffService.getDeletedStaff();
        java.util.List<com.Cinema.movie_backend.DTO.UserResponse> response = deletedStaff.stream()
                .map(com.Cinema.movie_backend.DTO.UserResponse::fromEntity)
                .collect(java.util.stream.Collectors.toList());
        return ResponseEntity.ok(response);
    }

    /**
     * Khôi phục tài khoản Staff
     */
    @PutMapping("/{id}/restore")
    public ResponseEntity<?> restoreStaff(@PathVariable UUID id) {
        try {
            adminStaffService.restoreStaff(id);
            return ResponseEntity.ok(java.util.Map.of("message", "Đã khôi phục nhân viên thành công"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(java.util.Map.of("message", e.getMessage()));
        }
    }

    /**
     * Gửi email thông báo cho Staff
     */
    @PostMapping("/send-email")
    public ResponseEntity<?> sendEmailToStaff(@RequestBody StaffEmailRequest request) {
        try {
            adminStaffService.sendEmailToStaff(request.getStaffId(), request.getSubject(), request.getContent());
            return ResponseEntity.ok(java.util.Map.of("message", "Đã gửi email thành công"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(java.util.Map.of("message", e.getMessage()));
        }
    }
}
