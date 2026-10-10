package com.Cinema.movie_backend.DTO;

import com.Cinema.movie_backend.entity.OnlineMoviePrice;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OnlineMoviePriceResponse {
    private Long id;
    private Long movieId;
    private String movieTitle;
    private BigDecimal basePrice;
    private Integer discountPercentage;
    private BigDecimal finalPrice;
    private LocalDateTime promoStartDate;
    private LocalDateTime promoEndDate;
    private boolean isPromoActive;
    private Integer validityPeriodMinutes;

    public static OnlineMoviePriceResponse fromEntity(OnlineMoviePrice entity) {
        OnlineMoviePriceResponse response = new OnlineMoviePriceResponse();
        response.setId(entity.getId());
        response.setMovieId(entity.getMovie().getId());
        response.setMovieTitle(entity.getMovie().getTitle());
        response.setBasePrice(entity.getBasePrice());
        response.setDiscountPercentage(entity.getDiscountPercentage());
        response.setPromoStartDate(entity.getPromoStartDate());
        response.setPromoEndDate(entity.getPromoEndDate());
        response.setValidityPeriodMinutes(entity.getValidityPeriodMinutes());

        // Calculate if promo is active
        boolean active = false;
        LocalDateTime today = LocalDateTime.now();
        if (entity.getDiscountPercentage() != null && entity.getDiscountPercentage() > 0) {
            boolean afterStart = entity.getPromoStartDate() == null || !today.isBefore(entity.getPromoStartDate());
            boolean beforeEnd = entity.getPromoEndDate() == null || !today.isAfter(entity.getPromoEndDate());
            active = afterStart && beforeEnd;
        }
        response.setPromoActive(active);

        // Calculate final price
        if (active) {
            BigDecimal discountMultiplier = BigDecimal.valueOf(100 - entity.getDiscountPercentage()).divide(BigDecimal.valueOf(100));
            response.setFinalPrice(entity.getBasePrice().multiply(discountMultiplier));
        } else {
            response.setFinalPrice(entity.getBasePrice());
        }

        return response;
    }
}
