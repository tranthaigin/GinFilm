package com.Cinema.movie_backend.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComboSummaryDto {
    private UUID id;
    private String name;
    private Integer quantity;
    private Integer redeemedQuantity;
    private String redeemedBySeats;
}
