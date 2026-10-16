package com.Cinema.movie_backend.DTO;

import lombok.Data;

@Data
public class SeatRequest {
    private String rowSymbol;
    private Integer seatNumber;
    private String seatType;
    private String status;
    private Integer rowIndex;
    private Integer columnIndex;
}
