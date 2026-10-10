package com.Cinema.movie_backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "watch_history", indexes = {
    @Index(name = "idx_watch_history_user", columnList = "user_id"),
    @Index(name = "idx_watch_history_movie", columnList = "movie_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WatchHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "movie_id", nullable = false, foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Movie movie;

    @Column(nullable = false)
    private Integer position;

    @Column(name = "last_watched_at")
    private LocalDateTime lastWatchedAt;
}
