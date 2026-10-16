package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.DTO.MovieFormatRequest;
import com.Cinema.movie_backend.DTO.MovieFormatResponse;
import com.Cinema.movie_backend.service.MovieFormatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/movie-formats")
@RequiredArgsConstructor
public class MovieFormatController {
    private final MovieFormatService movieFormatService;

    @GetMapping
    public ResponseEntity<List<MovieFormatResponse>> getAllFormats(
            @RequestParam(defaultValue = "false") boolean includeDeleted) {
        return ResponseEntity.ok(movieFormatService.getAllFormats(includeDeleted));
    }

    @PostMapping
    public ResponseEntity<MovieFormatResponse> createFormat(@RequestBody MovieFormatRequest request) {
        return ResponseEntity.ok(movieFormatService.createFormat(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MovieFormatResponse> updateFormat(@PathVariable Long id, @RequestBody MovieFormatRequest request) {
        return ResponseEntity.ok(movieFormatService.updateFormat(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> softDeleteFormat(@PathVariable Long id) {
        movieFormatService.softDeleteFormat(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/restore")
    public ResponseEntity<Void> restoreFormat(@PathVariable Long id) {
        movieFormatService.restoreFormat(id);
        return ResponseEntity.ok().build();
    }
}
