package com.Cinema.movie_backend.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TheaterShowtimesResponse {
    private Long id;
    private String name;
    private String address;
    private String phone;
    private List<ShowtimeDto> showtimes;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ShowtimeDto {
        private Long id;
        private String time;
        private String format;
        private Long roomId;
        private String roomName;
    }
}
