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
import java.util.HashSet;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "movies", indexes = {
        @Index(name = "idx_movies_title", columnList = "title"),
        @Index(name = "idx_movies_release_date", columnList = "release_date"),
        @Index(name = "idx_movies_status", columnList = "status")
})
public class Movie {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "plot", columnDefinition = "TEXT")
    private String plot;

    @Column(name = "duration", nullable = false)
    private Integer duration;

    @Column(name = "release_date", nullable = false)
    private LocalDate releaseDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "start_time")
    private java.time.LocalTime startTime;

    @Column(name = "end_time")
    private java.time.LocalTime endTime;

    @Column(name = "poster_url", length = 500)
    private String posterUrl;

    @Column(name = "trailer_url", length = 500)
    private String trailerUrl;

    @Column(name = "age_rating", length = 10)
    private String ageRating;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    // TÍNH NĂNG XEM PHIM ONLINE 
    @Builder.Default 
    @Column(name = "is_online_available", nullable = false, columnDefinition = "boolean default false")
    private Boolean isOnlineAvailable = false;

    // TÍNH NĂNG CHIẾU RẠP
    @Builder.Default
    @Column(name = "is_cinema_available", nullable = false, columnDefinition = "boolean default true")
    private Boolean isCinemaAvailable = true;

    @Column(name = "video_url", length = 500)
    private String videoUrl;

    @Builder.Default
    @Column(name = "is_hidden", nullable = false, columnDefinition = "boolean default false")
    private Boolean isHidden = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Builder.Default 
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "movie_genres",
            joinColumns = @JoinColumn(
                    name = "movie_id",
                    foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT)
            ),
            inverseJoinColumns = @JoinColumn(
                    name = "genre_id",
                    foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT)
            ),
            indexes = {
                    @Index(name = "idx_movie_genres_movie_id", columnList = "movie_id"),
                    @Index(name = "idx_movie_genres_genre_id", columnList = "genre_id")
            }
    )
    private Set<Genre> genres = new HashSet<>();

    @Builder.Default
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "movie_movie_formats",
            joinColumns = @JoinColumn(
                    name = "movie_id",
                    foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT)
            ),
            inverseJoinColumns = @JoinColumn(
                    name = "movie_format_id",
                    foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT)
            )
    )
    private Set<MovieFormat> formats = new HashSet<>();

    @OneToOne(mappedBy = "movie", cascade = CascadeType.ALL, orphanRemoval = true)
    private OnlineMoviePrice onlinePrice;
}