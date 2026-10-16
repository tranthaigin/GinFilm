package com.Cinema.movie_backend.DTO;

import lombok.Data;

@Data
public class ReviewReportProcessRequest {
    private String action; // APPROVE or REJECT
    private String adminNote;
}
