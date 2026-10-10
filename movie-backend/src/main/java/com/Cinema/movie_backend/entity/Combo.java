package com.Cinema.movie_backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "combos", indexes = {
        @Index(name = "idx_combos_name", columnList = "name"),
        @Index(name = "idx_combos_status", columnList = "status")
})
public class Combo {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Builder.Default
    @Column(name = "type", nullable = false, length = 50)
    private String type = "COMBO";

    @Builder.Default
    @Column(name = "status", nullable = false, length = 50)
    private String status = "IN_STOCK";

    @Column(name = "price", nullable = false)
    private Integer price;

    @Builder.Default
    @Column(name = "discount_percent", columnDefinition = "integer default 0")
    private Integer discountPercent = 0;

    @Builder.Default
    @Column(name = "is_hidden", nullable = false, columnDefinition = "boolean default false")
    private Boolean isHidden = false;

    @Column(name = "discount_start_date")
    private LocalDateTime discountStartDate;

    @Column(name = "discount_end_date")
    private LocalDateTime discountEndDate;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
