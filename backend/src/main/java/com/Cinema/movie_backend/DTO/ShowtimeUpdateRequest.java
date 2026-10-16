package com.Cinema.movie_backend.DTO;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class ShowtimeUpdateRequest {
    private Long movieId;
    private Long roomId;
    private LocalDate showDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private String format;
}
