package com.Cinema.movie_backend.DTO;

import lombok.Data;

import java.time.LocalDate;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * DTO cho staff tạo tài khoản user mới.
 * Username và password sẽ được tự động sinh phía backend:
 *   - username = phần trước "@" của email
 *   - password = chuỗi ngẫu nhiên mạnh (8+ ký tự, hoa/thường/số/đặc biệt)
 * Thông tin đăng nhập sẽ được gửi về email của user.
 */
@Data
public class StaffCreateUserRequest {
    @NotBlank(message = "Email không được để trống")
    @Pattern(regexp = "^[A-Za-z0-9+_.-]+@(.+)$", message = "Email không hợp lệ")
    private String email;
    private String fullName;
    
    @Pattern(regexp = "^(03|05|07|08|09)\\d{8}$", message = "Số điện thoại không hợp lệ")
    private String phoneNumber;
    private LocalDate dateOfBirth;
}
