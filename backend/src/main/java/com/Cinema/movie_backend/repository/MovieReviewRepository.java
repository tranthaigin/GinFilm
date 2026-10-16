package com.Cinema.movie_backend.repository;

import com.Cinema.movie_backend.entity.MovieReview;
import com.Cinema.movie_backend.entity.ReviewStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MovieReviewRepository extends JpaRepository<MovieReview, UUID> {

    List<MovieReview> findByMovieIdAndUserId(Long movieId, UUID userId);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(r) FROM MovieReview r WHERE r.movie.id = :movieId AND r.user.id = :userId")
    int countByMovieIdAndUserId(@org.springframework.data.repository.query.Param("movieId") Long movieId, @org.springframework.data.repository.query.Param("userId") UUID userId);

    Page<MovieReview> findByMovieIdAndStatus(Long movieId, ReviewStatus status, Pageable pageable);

    @org.springframework.data.jpa.repository.Query("SELECT r FROM MovieReview r WHERE r.movie.id = :movieId AND r.status = :status AND NOT EXISTS (SELECT 1 FROM ReviewReport rr WHERE rr.review.id = r.id AND rr.user.id = :userId)")
    Page<MovieReview> findByMovieIdAndStatusAndNotReportedByUser(@org.springframework.data.repository.query.Param("movieId") Long movieId, @org.springframework.data.repository.query.Param("status") ReviewStatus status, @org.springframework.data.repository.query.Param("userId") UUID userId, Pageable pageable);

    Optional<MovieReview> findByIdAndUserId(UUID id, UUID userId);

    @org.springframework.data.jpa.repository.Query("SELECT AVG(r.rating) FROM MovieReview r WHERE r.movie.id = :movieId AND r.status = 'APPROVED'")
    Double getAverageRatingByMovieId(@org.springframework.data.repository.query.Param("movieId") Long movieId);
}
