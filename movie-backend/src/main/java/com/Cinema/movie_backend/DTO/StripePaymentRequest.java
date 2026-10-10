package com.Cinema.movie_backend.DTO;

import lombok.Data;

@Data
public class StripePaymentRequest {
    private Long amount;
    private String currency;
    private String bookingId;
}