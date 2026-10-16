package com.Cinema.movie_backend.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComboResponse {
    private UUID id;
    private String name;
    private String imageUrl;
    private String description;
    private String type;
    private String status;
    private Integer price;
    private Integer discountPercent;
    private Integer originalDiscountPercent;
    private Integer finalPrice;
    private Boolean isHidden;
    private LocalDateTime discountStartDate;
    private LocalDateTime discountEndDate;
    private Integer sold;
    private Long revenue;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
