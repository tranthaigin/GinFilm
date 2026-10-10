package com.Cinema.movie_backend.DTO;

import com.Cinema.movie_backend.entity.Promotion;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PromotionResponse {
    private Long id;
    private String title;
    private String description;
    private String code;
    private Integer discount;
    private String discountType;
    private String scope;
    private Double maxDiscount;
    private Double minOrderValue;
    private Integer usedCount;
    private Integer usageLimitPerUser;
    private String status;
    private String imageUrl;
    private String startDate;
    private String end;
    private Boolean isHidden;
    private String createAt;

    public static PromotionResponse fromEntity(Promotion promotion) {
        if (promotion == null) return null;
        PromotionResponse response = new PromotionResponse();
        response.setId(promotion.getId());
        response.setTitle(promotion.getTitle());
        response.setDescription(promotion.getDescription());
        response.setCode(promotion.getCode());
        response.setDiscount(promotion.getDiscount());
        if (promotion.getDiscountType() != null) response.setDiscountType(promotion.getDiscountType().name());
        if (promotion.getScope() != null) response.setScope(promotion.getScope().name());
        response.setMaxDiscount(promotion.getMaxDiscount());
        response.setMinOrderValue(promotion.getMinOrderValue() != null ? promotion.getMinOrderValue() : 0.0);
        response.setUsedCount(promotion.getUsedCount());
        response.setUsageLimitPerUser(promotion.getUsageLimitPerUser());
        response.setImageUrl(promotion.getImageUrl());
        
        if (promotion.getStartDate() != null) {
            response.setStartDate(promotion.getStartDate().toString());
        }
        if (promotion.getEnd() != null) {
            response.setEnd(promotion.getEnd().toString());
        }
        
        // Auto-compute status
        LocalDate today = LocalDate.now();
        if (promotion.getEnd() != null && promotion.getEnd().isBefore(today)) {
            response.setStatus("ended");
        } else if (promotion.getStartDate() != null && promotion.getStartDate().isAfter(today)) {
            response.setStatus("upcoming");
        } else {
            response.setStatus("active");
        }
        
        response.setIsHidden(promotion.getIsHidden());
        if (promotion.getCreateAt() != null) {
            response.setCreateAt(promotion.getCreateAt().toString());
        }
        return response;
    }
}
