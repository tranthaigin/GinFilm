package com.Cinema.movie_backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

import com.Cinema.movie_backend.enums.DiscountType;
import com.Cinema.movie_backend.enums.PromotionScope;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "promotions", indexes = {
        @Index(name = "idx_promotions_title", columnList = "title"),
        @Index(name = "idx_promotions_code", columnList = "code")
})
public class Promotion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "code", length = 50)
    private String code;

    @Column(name = "discount")
    private Integer discount;

    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type", length = 20)
    private DiscountType discountType;

    @Enumerated(EnumType.STRING)
    @Column(name = "scope", length = 20)
    private PromotionScope scope;

    @Column(name = "max_discount")
    private Double maxDiscount;

    @Builder.Default
    @Column(name = "min_order_value")
    private Double minOrderValue = 0.0;

    @Builder.Default
    @Column(name = "used_count", columnDefinition = "integer default 0")
    private Integer usedCount = 0;

    @Column(name = "usage_limit_per_user")
    private Integer usageLimitPerUser;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate end;

    @Builder.Default
    @Column(name = "is_hidden", nullable = false, columnDefinition = "boolean default false")
    private Boolean isHidden = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
