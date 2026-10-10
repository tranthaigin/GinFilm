package com.Cinema.movie_backend.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PromotionRequest {
    private String title;
    private String description;
    private String code;
    private Integer discount;
    private String discountType;
    private String scope;
    private Double maxDiscount;
    private Double minOrderValue;
    private Integer usageLimitPerUser;
    private String startDate;
    private String end;
}
