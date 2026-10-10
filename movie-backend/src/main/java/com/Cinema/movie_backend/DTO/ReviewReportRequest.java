package com.Cinema.movie_backend.DTO;

import lombok.Data;

import java.util.UUID;

@Data
public class ReviewReportRequest {
    private UUID reviewId;
    private String reason;
    private String subReason;
    private String details;
}
