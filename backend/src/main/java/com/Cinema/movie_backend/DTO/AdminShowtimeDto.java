package com.Cinema.movie_backend.DTO;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
public class AdminShowtimeDto {
    private Long id;
    private Long theaterId;
    private Long movieId;
    private String movieTitle;
    private Long roomId;
    private String roomName;
    private LocalDate showDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private String format;
    private Boolean isHidden;
    private Boolean isDraft;
}
