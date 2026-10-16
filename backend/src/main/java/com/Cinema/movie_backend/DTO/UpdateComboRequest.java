package com.Cinema.movie_backend.DTO;

import lombok.Data;

import java.util.List;

@Data
public class UpdateComboRequest {
    @jakarta.validation.constraints.NotNull
    @jakarta.validation.Valid
    private List<ComboItemRequest> combos;
}
