package com.Cinema.movie_backend.DTO;

import lombok.Data;

import java.util.UUID;

@Data
public class ComboItemRequest {
    @jakarta.validation.constraints.NotNull
    private UUID comboId;
    @jakarta.validation.constraints.NotNull
    @jakarta.validation.constraints.Min(1)
    @jakarta.validation.constraints.Max(99)
    private Integer quantity;
}
