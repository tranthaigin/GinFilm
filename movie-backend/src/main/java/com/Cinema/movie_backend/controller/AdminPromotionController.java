package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.DTO.PromotionRequest;
import com.Cinema.movie_backend.DTO.PromotionResponse;
import com.Cinema.movie_backend.entity.Promotion;
import com.Cinema.movie_backend.service.PromotionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/promotions")
public class AdminPromotionController {

    @Autowired
    private PromotionService promotionService;

    @GetMapping
    public ResponseEntity<List<PromotionResponse>> getAllPromotions() {
        List<Promotion> promotions = promotionService.getAllPromotions();
        List<PromotionResponse> response = promotions.stream()
                .map(PromotionResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createPromotion(
            @ModelAttribute PromotionRequest request,
            @RequestPart(value = "image", required = false) MultipartFile image) {
        try {
            Promotion promotion = promotionService.createPromotion(request, image);
            return ResponseEntity.status(HttpStatus.CREATED).body(PromotionResponse.fromEntity(promotion));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updatePromotion(
            @PathVariable Long id,
            @ModelAttribute PromotionRequest request,
            @RequestPart(value = "image", required = false) MultipartFile image) {
        try {
            Promotion promotion = promotionService.updatePromotion(id, request, image);
            return ResponseEntity.ok(PromotionResponse.fromEntity(promotion));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PatchMapping("/{id}/toggle-visibility")
    public ResponseEntity<?> togglePromotionVisibility(@PathVariable Long id) {
        try {
            Promotion promotion = promotionService.togglePromotionVisibility(id);
            String message = promotion.getIsHidden() ? "Ẩn ưu đãi thành công" : "Hiện ưu đãi thành công";
            return ResponseEntity.ok(Map.of(
                    "message", message,
                    "isHidden", promotion.getIsHidden()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }
}
