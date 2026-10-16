package com.Cinema.movie_backend.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeatResponse {
    private Long id;
    private String rowSymbol;
    private Integer seatNumber;
    private String seatType;
    private String status;
    private Integer rowIndex;
    private Integer columnIndex;
}
