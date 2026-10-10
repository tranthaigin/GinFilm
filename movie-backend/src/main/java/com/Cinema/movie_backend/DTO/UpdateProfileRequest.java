package com.Cinema.movie_backend.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class UpdateProfileRequest {

    @NotBlank(message = "Họ và tên không được để trống")
    @Size(min = 2, max = 100, message = "Họ và tên phải từ 2 đến 100 ký tự")
    private String fullName;

    @Pattern(
        regexp = "^(03|05|07|08|09)\\d{8}$",
        message = "Số điện thoại không hợp lệ. Phải bắt đầu bằng 03/05/07/08/09 và có 10 chữ số"
    )
    private String phoneNumber;

    private LocalDate dateOfBirth;
}
