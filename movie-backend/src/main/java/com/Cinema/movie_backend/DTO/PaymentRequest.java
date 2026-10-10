package com.Cinema.movie_backend.DTO;

import com.Cinema.movie_backend.enums.PaymentMethod;
import lombok.Data;

@Data
public class PaymentRequest {
    private PaymentMethod paymentMethod;
    private String promoCode;
    private Integer pointsToUse;
}
