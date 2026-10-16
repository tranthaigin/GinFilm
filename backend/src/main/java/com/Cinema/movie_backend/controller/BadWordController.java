package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.DTO.BadWordRequest;
import com.Cinema.movie_backend.DTO.BadWordResponse;
import com.Cinema.movie_backend.service.BadWordService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/bad-words")
@RequiredArgsConstructor
public class BadWordController {

    private final BadWordService badWordService;

    @GetMapping
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<List<BadWordResponse>> getAllBadWords() {
        return ResponseEntity.ok(badWordService.getAllBadWords());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<BadWordResponse> addBadWord(@RequestBody BadWordRequest request) {
        return ResponseEntity.ok(badWordService.addBadWord(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<BadWordResponse> updateBadWord(@PathVariable UUID id, @RequestBody BadWordRequest request) {
        return ResponseEntity.ok(badWordService.updateBadWord(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<Void> deleteBadWord(@PathVariable UUID id) {
        badWordService.deleteBadWord(id);
        return ResponseEntity.noContent().build();
    }
}
