package com.Cinema.movie_backend.DTO;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class GoogleLoginRequest {
    @NotBlank(message = "Token Google không được để trống")
    private String idToken;
}
