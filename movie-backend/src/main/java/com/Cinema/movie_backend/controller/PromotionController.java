package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.DTO.PromotionResponse;
import com.Cinema.movie_backend.entity.Promotion;
import com.Cinema.movie_backend.service.PromotionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/promotions")
public class PromotionController {

    @Autowired
    private PromotionService promotionService;

    @Autowired
    private com.Cinema.movie_backend.util.JwtUtil jwtUtil;

    @Autowired
    private com.Cinema.movie_backend.repository.UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<PromotionResponse>> getVisiblePromotions() {
        List<Promotion> promotions = promotionService.getVisiblePromotions();
        List<PromotionResponse> response = promotions.stream()
                .map(PromotionResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getPromotionById(@PathVariable Long id) {
        try {
            Promotion promotion = promotionService.getPromotionById(id);
            if (promotion.getIsHidden()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Ưu đãi này hiện đã bị ẩn.");
            }
            return ResponseEntity.ok(PromotionResponse.fromEntity(promotion));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    @PostMapping("/apply")
    public ResponseEntity<?> applyPromotion(
            @RequestBody java.util.Map<String, Object> request,
            @CookieValue(value = "accessToken", required = false) String token) {
        try {
            java.util.UUID userId = null;
            if (token != null && !token.isBlank()) {
                String email = jwtUtil.extractEmail(token);
                if (email != null) {
                    com.Cinema.movie_backend.entity.User user = userRepository.findByEmailManual(email).orElse(null);
                    if (user != null) {
                        userId = user.getId();
                    }
                }
            }

            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(java.util.Map.of("message", "Vui lòng đăng nhập để áp dụng mã khuyến mãi."));
            }

            String code = (String) request.get("code");
            if (code == null || code.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(java.util.Map.of("message", "Vui lòng nhập mã khuyến mãi"));
            }
            double ticketTotal = Double.parseDouble(request.getOrDefault("ticketTotal", "0").toString());
            double comboTotal = Double.parseDouble(request.getOrDefault("comboTotal", "0").toString());
            
            double discountAmount = promotionService.applyPromotion(code, ticketTotal, comboTotal, userId);
            Promotion promotion = promotionService.getPromotionByCode(code);
            
            return ResponseEntity.ok(java.util.Map.of(
                "discountAmount", discountAmount,
                "scope", promotion.getScope().name(),
                "message", "Áp dụng mã giảm giá thành công!"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", e.getMessage()));
        }
    }
}
