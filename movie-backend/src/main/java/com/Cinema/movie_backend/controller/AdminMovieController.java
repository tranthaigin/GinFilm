package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.DTO.MovieRequest;
import com.Cinema.movie_backend.DTO.MovieResponse;
import com.Cinema.movie_backend.entity.Movie;
import com.Cinema.movie_backend.service.MovieService;
import com.Cinema.movie_backend.repository.ShowtimeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.stream.Collectors;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/movies")
public class AdminMovieController {

    @Autowired
    private MovieService movieService;

    @Autowired
    private ShowtimeRepository showtimeRepository;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createMovie(
            @ModelAttribute MovieRequest request,
            @RequestPart(value = "poster", required = false) MultipartFile poster) {
        try {
            Movie movie = movieService.createMovie(request, poster);
            return ResponseEntity.status(HttpStatus.CREATED).body(MovieResponse.fromEntity(movie));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<List<MovieResponse>> getAllMovies() {
        List<Movie> movies = movieService.getAllMovies();
        List<MovieResponse> response = movies.stream()
                .map(movie -> {
                    MovieResponse res = MovieResponse.fromEntity(movie);
                    res.setHasShowtimes(showtimeRepository.hasActiveShowtimes(movie.getId()));
                    return res;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateMovie(
            @PathVariable Long id,
            @ModelAttribute MovieRequest request,
            @RequestPart(value = "poster", required = false) MultipartFile poster) {
        try {
            Movie movie = movieService.updateMovie(id, request, poster);
            return ResponseEntity.ok(MovieResponse.fromEntity(movie));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PatchMapping("/{id}/toggle-visibility")
    public ResponseEntity<?> toggleMovieVisibility(@PathVariable Long id) {
        try {
            Movie movie = movieService.toggleMovieVisibility(id);
            String message = movie.getIsHidden() ? "Ẩn phim thành công" : "Hiện phim thành công";
            return ResponseEntity.ok(Map.of(
                "message", message,
                "isHidden", movie.getIsHidden()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }
}
