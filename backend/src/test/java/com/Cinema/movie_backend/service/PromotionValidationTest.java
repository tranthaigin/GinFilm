package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.DTO.PromotionRequest;
import com.Cinema.movie_backend.entity.Promotion;
import com.Cinema.movie_backend.enums.DiscountType;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class PromotionValidationTest {
    PromotionService service = new PromotionService();
    @Test void negativeDiscountCannotCreatePromotion() {
        PromotionRequest request = new PromotionRequest(); request.setDiscount(-5);
        assertThrows(IllegalArgumentException.class, () -> service.createPromotion(request, null));
    }
    @Test void nonFiniteMinimumCannotCreatePromotion() {
        PromotionRequest request = new PromotionRequest(); request.setDiscount(5); request.setMinOrderValue(Double.NaN);
        assertThrows(IllegalArgumentException.class, () -> service.createPromotion(request, null));
    }
    @Test void reversedDatesCannotCreatePromotion() {
        PromotionRequest request = new PromotionRequest(); request.setDiscount(5);
        request.setStartDate("2026-10-20"); request.setEnd("2026-10-19");
        assertThrows(IllegalArgumentException.class, () -> service.createPromotion(request, null));
    }
    @Test void percentageDiscountRoundsDownToWholeDong() {
        Promotion promo = Promotion.builder().discount(33).discountType(DiscountType.PERCENTAGE).build();
        assertEquals(3333, service.calculateDiscountAmount(promo, 10101, 0));
    }
}
