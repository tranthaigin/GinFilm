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
public class MovieShowtimeDto {
    private Long movieId;
    private String title;
    private String image;
    private String duration; // e.g., "120 phút"
    private String genre; // e.g., "Gia đình, Tình cảm"
    private String ageRating; // e.g., "T16", "P", "K"
    private String director; // mock
    private String cast; // mock
    private String description;
    private String trailerUrl;
    private List<FormatDto> formats;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class FormatDto {
        private String name;
        private List<ShowtimeTimeDto> times;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ShowtimeTimeDto {
        private Long id;
        private String time;
        private String roomName;
    }
}
