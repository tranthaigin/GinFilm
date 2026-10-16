package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.DTO.AdminUpdateUserRequest;
import com.Cinema.movie_backend.DTO.UserResponse;
import com.Cinema.movie_backend.entity.User;
import com.Cinema.movie_backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.Cinema.movie_backend.DTO.StaffCreateUserRequest;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/customers")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<UserResponse>> getCustomers() {
        List<User> customers = userService.getCustomers();
        List<UserResponse> response = customers.stream()
                .map(UserResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<?> createCustomer(@RequestBody StaffCreateUserRequest request) {
        try {
            User newUser = userService.createUserByStaff(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(UserResponse.fromEntity(newUser));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateCustomer(@PathVariable UUID id, @RequestBody AdminUpdateUserRequest request) {
        try {
            User updatedUser = userService.updateUserByAdmin(id, request);
            return ResponseEntity.ok(UserResponse.fromEntity(updatedUser));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCustomer(@PathVariable UUID id) {
        try {
            User deletedUser = userService.softDeleteUser(id);
            return ResponseEntity.ok(Map.of("message", "Đã xoá khách hàng thành công"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/deleted")
    public ResponseEntity<List<UserResponse>> getDeletedCustomers() {
        List<User> deletedCustomers = userService.getDeletedCustomers();
        List<UserResponse> response = deletedCustomers.stream()
                .map(UserResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/restore")
    public ResponseEntity<?> restoreCustomer(@PathVariable UUID id) {
        try {
            User restoredUser = userService.restoreUser(id);
            return ResponseEntity.ok(Map.of("message", "Đã khôi phục khách hàng thành công"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }
}
