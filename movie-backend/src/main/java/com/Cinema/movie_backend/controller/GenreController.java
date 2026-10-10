package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.DTO.GenreResponse;
import com.Cinema.movie_backend.entity.Genre;
import com.Cinema.movie_backend.repository.GenreRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/genres")
public class GenreController {

    @Autowired
    private GenreRepository genreRepository;

    @GetMapping
    public ResponseEntity<List<GenreResponse>> getAllGenres() {
        List<Genre> genres = genreRepository.findAll();
        List<GenreResponse> response = genres.stream()
                .map(GenreResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }
}
