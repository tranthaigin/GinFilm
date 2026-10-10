package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.DTO.OnlineMoviePriceRequest;
import com.Cinema.movie_backend.DTO.OnlineMoviePriceResponse;
import com.Cinema.movie_backend.service.OnlineMoviePriceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/online-prices")
@RequiredArgsConstructor
public class OnlineMoviePriceController {
    
    private final OnlineMoviePriceService priceService;

    @GetMapping
    public ResponseEntity<List<OnlineMoviePriceResponse>> getAllPrices() {
        return ResponseEntity.ok(priceService.getAllOnlinePrices());
    }

    @GetMapping("/movie/{movieId}")
    public ResponseEntity<OnlineMoviePriceResponse> getPriceByMovieId(@PathVariable Long movieId) {
        return ResponseEntity.ok(priceService.getPriceByMovieId(movieId));
    }

    @PutMapping("/movie/{movieId}")
    public ResponseEntity<OnlineMoviePriceResponse> updatePrice(
            @PathVariable Long movieId,
            @RequestBody OnlineMoviePriceRequest request) {
        return ResponseEntity.ok(priceService.updatePrice(movieId, request));
    }
}
