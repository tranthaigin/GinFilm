package com.Cinema.movie_backend.DTO;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Email;
import lombok.Data;

@Data
public class ForgotPasswordRequest {
    @NotBlank(message = "Email không được để trống") // Kiểm tra email không được để trống
    @Email(message = " Định dạng Email không hợp lệ") // Kiểm tra định dạng email hợp lệ
    private String email;
}
