package com.Cinema.movie_backend.DTO;

import lombok.Data;

import java.util.List;

@Data
public class UpdateComboRequest {
    private List<ComboItemRequest> combos;
}
