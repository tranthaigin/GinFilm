package com.Cinema.movie_backend.repository;

import com.Cinema.movie_backend.entity.ReviewReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ReviewReportRepository extends JpaRepository<ReviewReport, UUID> {

    boolean existsByReviewIdAndUserId(UUID reviewId, UUID userId);
    
    java.util.List<ReviewReport> findByReviewIdAndUserId(UUID reviewId, UUID userId);
    
    org.springframework.data.domain.Page<ReviewReport> findByStatus(com.Cinema.movie_backend.entity.ReportStatus status, org.springframework.data.domain.Pageable pageable);
    
    java.util.List<ReviewReport> findByReviewIdAndStatus(UUID reviewId, com.Cinema.movie_backend.entity.ReportStatus status);
}
