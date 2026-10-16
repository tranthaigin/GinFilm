package com.Cinema.movie_backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "online_tickets", indexes = {
    @Index(name = "idx_online_ticket_code", columnList = "ticket_code"),
    @Index(name = "idx_online_ticket_user", columnList = "user_id"),
    @Index(name = "idx_online_ticket_movie", columnList = "movie_id"),
    @Index(name = "idx_online_ticket_viewer", columnList = "current_viewer_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OnlineTicket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "movie_id", nullable = false, foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Movie movie;

    @Column(name = "purchase_time", nullable = false)
    private LocalDateTime purchaseTime;

    @Column(nullable = false)
    private Double price;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", length = 20)
    private com.Cinema.movie_backend.enums.PaymentStatus paymentStatus = com.Cinema.movie_backend.enums.PaymentStatus.PENDING;

    @Enumerated(EnumType.STRING)
    private com.Cinema.movie_backend.enums.PaymentMethod paymentMethod;
    private String providerReference;
    private String refundReference;
    private String refundedBy;
    private LocalDateTime refundedAt;

    @Column(name = "ticket_code", length = 50)
    private String ticketCode;

    @Column(name = "activated_at")
    private LocalDateTime activatedAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "time_limit_minutes")
    private Integer timeLimitMinutes = 300;

    @Column(name = "is_banned")
    private Boolean isBanned = false;

    @Column(name = "current_session_token", length = 255)
    private String currentSessionToken;

    @Column(name = "ip_address", length = 50)
    private String ipAddress;

    @Column(name = "device_info", length = 255)
    private String deviceInfo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_viewer_id", foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private User currentViewer;

    @Column(name = "consumed_time_seconds")
    private Integer consumedTimeSeconds = 0;

    @Column(name = "last_watched_at")
    private java.time.LocalDateTime lastWatchedAt;

    @Column(name = "is_review_reminded")
    private Boolean isReviewReminded = false;

    @Column(name = "is_playing")
    private Boolean isPlaying = false;

    @Column(name = "watch_position")
    private Integer watchPosition = 0;

    @Column(name = "points_used", columnDefinition = "integer default 0")
    private Integer pointsUsed = 0;

    @Column(name = "points_earned", columnDefinition = "integer default 0")
    private Integer pointsEarned = 0;

    @Builder.Default
    @Column(name = "member_points_earned", columnDefinition = "integer default 0")
    private Integer memberPointsEarned = 0;

    @Column(name = "promotion_code", length = 50)
    private String promotionCode;
}
