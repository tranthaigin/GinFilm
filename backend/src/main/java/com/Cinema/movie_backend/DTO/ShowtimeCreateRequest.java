package com.Cinema.movie_backend.DTO;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class ShowtimeCreateRequest {
    private Long theaterId;
    private Long movieId;
    private Long roomId;
    private LocalDate showDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private String format;
    private Boolean isHidden;
    private Boolean isDraft;
}
