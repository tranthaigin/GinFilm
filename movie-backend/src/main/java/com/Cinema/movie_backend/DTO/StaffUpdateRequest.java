package com.Cinema.movie_backend.DTO;

import lombok.Data;
import java.time.LocalDate;
import com.Cinema.movie_backend.entity.UserStatus;
import jakarta.validation.constraints.Pattern;

@Data
public class StaffUpdateRequest {
    @Pattern(regexp = "^[A-Za-z0-9+_.-]+@(.+)$", message = "Email không hợp lệ")
    private String email;
    private UserStatus status;
    private String fullName;
    
    @Pattern(regexp = "^(03|05|07|08|09)\\d{8}$", message = "Số điện thoại không hợp lệ")
    private String phoneNumber;
    private LocalDate dateOfBirth;
}