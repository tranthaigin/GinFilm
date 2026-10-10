package com.Cinema.movie_backend.DTO;

import com.Cinema.movie_backend.entity.ReviewStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class ReviewResponse {
    private UUID id;
    private Long movieId;
    private String username;
    private String fullName;
    private String avatar;
    private Integer memberPoints;
    private Integer membershipTier;
    private Integer rating;
    private String content;
    private Boolean hasSpoiler;
    private Boolean isSpam;
    private ReviewStatus status;
    private Integer likeCount;
    private Integer dislikeCount;
    private Integer reportCount;
    private Boolean likedByMe;     // user hiện tại đã like chưa
    private Boolean dislikedByMe;  // user hiện tại đã dislike chưa
    private Boolean reportedByMe;  // user hiện tại đã report chưa
    private Boolean reportedSpoilerByMe; // user hiện tại đã report spoil chưa
    private LocalDateTime createdAt;
}
