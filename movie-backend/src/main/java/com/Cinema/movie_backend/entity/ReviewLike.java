package com.Cinema.movie_backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(
        name = "review_likes",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_review_like_review_user", columnNames = {"review_id", "user_id"})
        },
        indexes = {
                @Index(name = "idx_review_like_review", columnList = "review_id"),
                @Index(name = "idx_review_like_user", columnList = "user_id")
        }
)
public class ReviewLike {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "review_id", nullable = false, foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private MovieReview review;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private User user;

    @Column(name = "is_like")
    private Boolean isLike;
}
