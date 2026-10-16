package com.Cinema.movie_backend.DTO;

import lombok.Data;

import java.util.UUID;

@Data
public class ReviewReactionRequest {
    private UUID reviewId;
    private Boolean isLike;
}
