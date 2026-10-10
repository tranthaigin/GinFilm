package com.Cinema.movie_backend.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewReportAdminResponse {
    private UUID reportId;
    private LocalDateTime createdAt;
    
    // Movie info
    private Long movieId;
    private String movieTitle;
    private String moviePosterUrl;
    
    // Customer/Reporter info
    private UUID reporterId;
    private String reporterName;
    private String reporterEmail;
    
    // Reported person (Reviewer) info
    private String reportedUserName;
    private String reportedUserEmail;
    
    // Report content
    private String reportReason;
    private String reportSubReason;
    private String reportDetails;
    private com.Cinema.movie_backend.entity.ReportStatus status;
    private String adminNote;
    
    // Review content (for "View" action)
    private UUID reviewId;
    private String reviewContent;
    private Integer reviewRating;
    
    // Type flag
    private boolean isSpoilerReport;
}
