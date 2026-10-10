package com.Cinema.movie_backend.DTO;

import lombok.Data;

import java.util.List;

@Data
public class HoldSeatRequest {
    private Long showtimeId;
    private List<Long> seatIds;
}
