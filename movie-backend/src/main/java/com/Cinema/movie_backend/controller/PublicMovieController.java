package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.DTO.MovieResponse;
import com.Cinema.movie_backend.DTO.TheaterShowtimesResponse;
import com.Cinema.movie_backend.entity.Movie;
import com.Cinema.movie_backend.service.MovieService;
import com.Cinema.movie_backend.service.ShowtimeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/movies")
public class PublicMovieController {

    @Autowired
    private MovieService movieService;

    @Autowired
    private ShowtimeService showtimeService;

    @GetMapping
    public ResponseEntity<List<MovieResponse>> getAllMovies() {
        List<Movie> movies = movieService.getAllMovies();
        List<MovieResponse> response = movies.stream()
                .filter(m -> !Boolean.TRUE.equals(m.getIsHidden()))
                .map(MovieResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getMovieById(@PathVariable Long id) {
        try {
            Movie movie = movieService.getMovieById(id);
            return ResponseEntity.ok(MovieResponse.fromEntity(movie));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(e.getMessage());
        }
    }

    @GetMapping("/genre/{genreId}")
    public ResponseEntity<List<MovieResponse>> getMoviesByGenre(@PathVariable Integer genreId) {
        List<Movie> movies = movieService.getMoviesByGenreId(genreId);
        List<MovieResponse> response = movies.stream()
                .filter(m -> !Boolean.TRUE.equals(m.getIsHidden()))
                .map(MovieResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/showtimes")
    public ResponseEntity<?> getShowtimesByMovieAndProvinceAndDate(
            @PathVariable Long id,
            @RequestParam("provinceId") Long provinceId,
            @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        try {
            List<TheaterShowtimesResponse> showtimes = showtimeService.getShowtimesByMovieAndProvinceAndDate(id, provinceId, date);
            return ResponseEntity.ok(showtimes);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Lỗi khi tải suất chiếu: " + e.getMessage());
        }
    }

    @Autowired
    private com.Cinema.movie_backend.repository.MovieReviewRepository movieReviewRepository;

    @Autowired
    private com.Cinema.movie_backend.repository.ShowtimeRepository showtimeRepository;

    @GetMapping("/search")
    public ResponseEntity<List<MovieResponse>> searchMovies(@RequestParam("q") String keyword) {
        List<Movie> movies = movieService.searchMovies(keyword);
        List<MovieResponse> response = movies.stream()
                .map(m -> {
                    MovieResponse res = MovieResponse.fromEntity(m);
                    Double avgRating = movieReviewRepository.getAverageRatingByMovieId(m.getId());
                    res.setAverageRating(avgRating != null ? avgRating : 0.0);
                    res.setHasShowtimes(showtimeRepository.hasActiveShowtimes(m.getId()));
                    return res;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }
}
