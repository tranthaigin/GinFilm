package com.Cinema.movie_backend.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BadWordResponse {
    private UUID id;
    private String word;
    private String reason;
    private String subReason;
}
