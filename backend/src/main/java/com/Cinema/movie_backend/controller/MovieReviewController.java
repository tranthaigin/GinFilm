package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.DTO.ReviewReactionRequest;
import com.Cinema.movie_backend.DTO.ReviewReportRequest;
import com.Cinema.movie_backend.DTO.ReviewRequest;
import com.Cinema.movie_backend.DTO.ReviewResponse;
import com.Cinema.movie_backend.exception.*;
import com.Cinema.movie_backend.service.MovieReviewService;
import com.Cinema.movie_backend.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class MovieReviewController {

    private final MovieReviewService movieReviewService;
    private final JwtUtil jwtUtil;

    /**
     * POST /api/reviews
     * Tạo review mới (phải đăng nhập, đã mua phim, đã xem >= 80%, chưa review)
     */
    @PostMapping
    public ResponseEntity<?> createReview(
            @CookieValue(value = "accessToken", required = false) String token,
            @RequestBody ReviewRequest request) {

        String email = extractEmail(token);
        if (email == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Vui lòng đăng nhập để viết đánh giá"));
        }

        try {
            ReviewResponse response = movieReviewService.createReview(email, request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (MovieNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (NotPurchasedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (NotWatchedEnoughException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (DuplicateReviewException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", e.getMessage()));
        } catch (UnauthorizedException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * GET /api/reviews/movie/{movieId}?page=0
     * Lấy danh sách review ACTIVE của 1 bộ phim (phân trang, 10 review/trang)
     * Authorization header tùy chọn → để lấy likedByMe, reportedByMe
     */
    @GetMapping("/movie/{movieId}")
    public ResponseEntity<?> getMovieReviews(
            @CookieValue(value = "accessToken", required = false) String token,
            @PathVariable Long movieId,
            @RequestParam(defaultValue = "0") int page) {
        try {
            String email = extractEmail(token); // null nếu chưa login
            Page<ReviewResponse> reviews = movieReviewService.getMovieReviews(movieId, page, email);
            return ResponseEntity.ok(reviews);
        } catch (MovieNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * GET /api/reviews/my/{movieId}
     * Lấy review của chính user hiện tại cho một bộ phim
     */
    @GetMapping("/my/{movieId}")
    public ResponseEntity<?> getMyReview(
            @CookieValue(value = "accessToken", required = false) String token,
            @PathVariable Long movieId) {

        String email = extractEmail(token);
        if (email == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Vui lòng đăng nhập"));
        }

        try {
            List<ReviewResponse> reviews = movieReviewService.getMyReviews(email, movieId);
            boolean canReview = movieReviewService.canReview(email, movieId);
            return ResponseEntity.ok()
                    .header("Cache-Control", "no-cache, no-store, must-revalidate")
                    .header("Pragma", "no-cache")
                    .header("Expires", "0")
                    .body(Map.of(
                            "reviews", reviews,
                            "canReview", canReview
                    ));
        } catch (UnauthorizedException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * POST /api/reviews/react
     * Toggle like / dislike một review
     */
    @PostMapping("/react")
    public ResponseEntity<?> toggleReaction(
            @CookieValue(value = "accessToken", required = false) String token,
            @RequestBody ReviewReactionRequest request) {

        String email = extractEmail(token);
        if (email == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Vui lòng đăng nhập để thao tác đánh giá"));
        }

        try {
            ReviewResponse response = movieReviewService.toggleReaction(email, request);
            return ResponseEntity.ok(response);
        } catch (ReviewNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (UnauthorizedException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * POST /api/reviews/report
     * Báo cáo một review vi phạm (mỗi user chỉ báo cáo 1 lần)
     */
    @PostMapping("/report")
    public ResponseEntity<?> reportReview(
            @CookieValue(value = "accessToken", required = false) String token,
            @RequestBody ReviewReportRequest request) {

        String email = extractEmail(token);
        if (email == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Vui lòng đăng nhập để báo cáo đánh giá"));
        }

        try {
            ReviewResponse response = movieReviewService.reportReview(email, request);
            return ResponseEntity.ok(Map.of("message", "Báo cáo đã được ghi nhận. Cảm ơn bạn!", "review", response));
        } catch (ReviewNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (DuplicateReviewException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", e.getMessage()));
        } catch (UnauthorizedException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * POST /api/reviews/mark-spoiler/{reviewId}
     * Đánh dấu review là spoil
     */
    @PostMapping("/mark-spoiler/{reviewId}")
    public ResponseEntity<?> markAsSpoiler(
            @CookieValue(value = "accessToken", required = false) String token,
            @PathVariable java.util.UUID reviewId) {

        String email = extractEmail(token);
        if (email == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Vui lòng đăng nhập để đánh dấu spoil"));
        }

        try {
            ReviewResponse response = movieReviewService.markAsSpoiler(email, reviewId);
            return ResponseEntity.ok(Map.of("message", "Đã đánh dấu spoil thành công", "review", response));
        } catch (ReviewNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (UnauthorizedException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ==================== ADMIN REPORT ====================

    /**
     * GET /api/reviews/admin/reports
     * Lấy danh sách báo cáo đánh giá (dành cho Admin)
     */
    @GetMapping("/admin/reports")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAdminReports(
            @CookieValue(value = "accessToken", required = false) String token,
            @RequestParam(defaultValue = "0") int page) {
        
        String email = extractEmail(token);
        if (email == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Vui lòng đăng nhập"));
        }
        
        try {
            Page<com.Cinema.movie_backend.DTO.ReviewReportAdminResponse> reports = movieReviewService.getAdminReports(page);
            return ResponseEntity.ok(reports);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * POST /api/reviews/admin/reports/{reportId}/process
     * Xác nhận giải quyết báo cáo
     */
    @PostMapping("/admin/reports/{reportId}/process")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> processReport(
            @CookieValue(value = "accessToken", required = false) String token,
            @PathVariable java.util.UUID reportId,
            @RequestBody com.Cinema.movie_backend.DTO.ReviewReportProcessRequest request) {
            
        String email = extractEmail(token);
        if (email == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Vui lòng đăng nhập"));
        }
        
        try {
            movieReviewService.processReport(reportId, request);
            return ResponseEntity.ok(Map.of("message", "Đã xử lý báo cáo thành công"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ==================== HELPER ====================

    private String extractEmail(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        try {
            return jwtUtil.extractEmail(token);
        } catch (Exception e) {
            return null;
        }
    }
}
