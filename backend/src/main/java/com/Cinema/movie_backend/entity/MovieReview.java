package com.Cinema.movie_backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(
        name = "reviews",
        indexes = {
                @Index(name = "idx_review_movie", columnList = "movie_id"),
                @Index(name = "idx_review_user", columnList = "user_id"),
                @Index(name = "idx_review_status", columnList = "status")
        }
)
public class MovieReview {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private java.util.UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "movie_id", nullable = false, foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private Movie movie;

    @Column(name = "rating", nullable = false)
    private Integer rating;

    @Column(name = "content", columnDefinition = "TEXT", nullable = false)
    private String content;

    @Builder.Default
    @Column(name = "has_spoiler", nullable = false, columnDefinition = "boolean default false")
    private Boolean hasSpoiler = false;

    @Builder.Default
    @Column(name = "is_spam", nullable = false, columnDefinition = "boolean default false")
    private Boolean isSpam = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 30, nullable = false)
    private ReviewStatus status = ReviewStatus.PENDING;

    @Builder.Default
    @Column(name = "like_count", nullable = false, columnDefinition = "integer default 0")
    private Integer likeCount = 0;

    @Builder.Default
    @Column(name = "dislike_count", nullable = false, columnDefinition = "integer default 0")
    private Integer dislikeCount = 0;

    @Builder.Default
    @Column(name = "report_count", nullable = false, columnDefinition = "integer default 0")
    private Integer reportCount = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
