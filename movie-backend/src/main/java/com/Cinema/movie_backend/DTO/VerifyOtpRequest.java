package com.Cinema.movie_backend.DTO;
import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Email;

@Data
public class VerifyOtpRequest {
   @NotBlank(message = "Email không được để trống")
   @Email(message = " Định dạng Email không hợp lệ")
   private String email;
   
   @NotBlank(message = "Mã OTP không được để trống")
   private String otp;
}
