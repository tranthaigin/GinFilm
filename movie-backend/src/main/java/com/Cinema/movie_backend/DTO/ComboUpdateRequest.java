package com.Cinema.movie_backend.DTO;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComboUpdateRequest {
    @NotBlank(message = "Tên Combo không được để trống")
    private String name;

    private String imageUrl;
    private String description;

    @NotBlank(message = "Trạng thái không được để trống")
    private String status;

    @NotNull(message = "Giá không được để trống")
    @Min(value = 0, message = "Giá không được nhỏ hơn 0")
    private Integer price;

    @NotNull(message = "Phần trăm giảm giá không được để trống")
    @Min(value = 0, message = "Giảm giá tối thiểu là 0%")
    @Max(value = 100, message = "Giảm giá tối đa là 100%")
    private Integer discountPercent;

    private java.time.LocalDateTime discountStartDate;
    private java.time.LocalDateTime discountEndDate;
}
