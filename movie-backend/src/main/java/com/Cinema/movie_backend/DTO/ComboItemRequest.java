package com.Cinema.movie_backend.DTO;

import lombok.Data;

import java.util.UUID;

@Data
public class ComboItemRequest {
    private UUID comboId;
    private Integer quantity;
}
