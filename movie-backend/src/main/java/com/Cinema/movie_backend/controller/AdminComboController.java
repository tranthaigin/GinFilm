package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.DTO.ComboCreateRequest;
import com.Cinema.movie_backend.DTO.ComboResponse;
import com.Cinema.movie_backend.DTO.ComboUpdateRequest;
import com.Cinema.movie_backend.service.ComboService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/combos")
public class AdminComboController {

    @Autowired
    private ComboService comboService;

    @GetMapping
    public ResponseEntity<List<ComboResponse>> getAllCombos() {
        return ResponseEntity.ok(comboService.getAllCombos());
    }

    @GetMapping("/revenue-chart")
    public ResponseEntity<List<java.util.Map<String, Object>>> getRevenueChart(
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.LocalDateTime startDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.LocalDateTime endDate) {
        if (startDate == null) {
            startDate = java.time.LocalDateTime.now().minusDays(30);
        }
        if (endDate == null) {
            endDate = java.time.LocalDateTime.now();
        }
        return ResponseEntity.ok(comboService.getComboChartData(startDate, endDate));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ComboResponse> getComboById(@PathVariable UUID id) {
        return ResponseEntity.ok(comboService.getComboById(id));
    }

    @PostMapping(consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ComboResponse> createCombo(
            @Valid @ModelAttribute ComboCreateRequest request,
            @RequestPart(value = "image", required = false) org.springframework.web.multipart.MultipartFile image) {
        return new ResponseEntity<>(comboService.createCombo(request, image), HttpStatus.CREATED);
    }

    @PutMapping(value = "/{id}", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ComboResponse> updateCombo(
            @PathVariable UUID id,
            @Valid @ModelAttribute ComboUpdateRequest request,
            @RequestPart(value = "image", required = false) org.springframework.web.multipart.MultipartFile image) {
        return ResponseEntity.ok(comboService.updateCombo(id, request, image));
    }

    @PatchMapping("/{id}/toggle-hide")
    public ResponseEntity<ComboResponse> toggleHideCombo(@PathVariable UUID id) {
        return ResponseEntity.ok(comboService.toggleHide(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCombo(@PathVariable UUID id) {
        comboService.deleteCombo(id);
        return ResponseEntity.noContent().build();
    }
}
