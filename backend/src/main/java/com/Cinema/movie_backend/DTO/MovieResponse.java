package com.Cinema.movie_backend.DTO;

import com.Cinema.movie_backend.entity.Movie;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.Set;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MovieResponse {
    private Long id;
    private String title;
    private String description;
    private Integer duration;
    private LocalDate releaseDate;
    private LocalDate endDate;
    private java.time.LocalTime startTime;
    private java.time.LocalTime endTime;
    private String posterUrl;
    private String trailerUrl;
    private String ageRating;
    private String status;
    private Boolean isOnlineAvailable;
    private Boolean isCinemaAvailable;
    private String videoUrl;
    private Boolean isHidden;
    private Set<GenreResponse> genres;
    private Set<MovieFormatResponse> formats;
    private OnlineMoviePriceResponse onlinePrice;
    private Double averageRating;
    private Boolean hasShowtimes;

    public static MovieResponse fromEntity(Movie movie) {
        MovieResponse response = new MovieResponse();
        response.setId(movie.getId());
        response.setTitle(movie.getTitle());
        response.setDescription(movie.getDescription());
        response.setDuration(movie.getDuration());
        response.setReleaseDate(movie.getReleaseDate());
        response.setEndDate(movie.getEndDate());
        response.setStartTime(movie.getStartTime());
        response.setEndTime(movie.getEndTime());
        response.setPosterUrl(movie.getPosterUrl());
        response.setTrailerUrl(movie.getTrailerUrl());
        response.setAgeRating(movie.getAgeRating());
        response.setStatus(movie.getStatus());
        response.setIsOnlineAvailable(movie.getIsOnlineAvailable());
        response.setIsCinemaAvailable(movie.getIsCinemaAvailable());
        response.setVideoUrl(movie.getVideoUrl());
        response.setIsHidden(movie.getIsHidden());

        if (movie.getGenres() != null) {
            response.setGenres(movie.getGenres().stream()
                    .map(GenreResponse::fromEntity)
                    .collect(Collectors.toSet()));
        }

        if (movie.getFormats() != null) {
            response.setFormats(movie.getFormats().stream()
                    .map(MovieFormatResponse::fromEntity)
                    .collect(Collectors.toSet()));
        }
        
        if (movie.getOnlinePrice() != null) {
            response.setOnlinePrice(OnlineMoviePriceResponse.fromEntity(movie.getOnlinePrice()));
        }
        
        return response;
    }
}
