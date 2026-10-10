package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.DTO.ReviewReactionRequest;
import com.Cinema.movie_backend.DTO.ReviewReportRequest;
import com.Cinema.movie_backend.DTO.ReviewRequest;
import com.Cinema.movie_backend.DTO.ReviewResponse;
import com.Cinema.movie_backend.entity.*;
import com.Cinema.movie_backend.exception.*;
import com.Cinema.movie_backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MovieReviewService {

    private final MovieReviewRepository movieReviewRepository;
    private final MovieRepository movieRepository;
    private final UserRepository userRepository;
    private final OnlineTicketRepository onlineTicketRepository;
    private final TicketRepository ticketRepository;
    private final ReviewLikeRepository reviewLikeRepository;
    private final ReviewReportRepository reviewReportRepository;
    private final BadWordRepository badWordRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationService notificationService;
    private final SpoilerCheckService spoilerCheckService;

    // ==================== CREATE REVIEW ====================

    /**
     * Tạo review mới.
     * Luồng: Đăng nhập → Đã mua → Quy tắc 80% → Duplicate check → Lọc từ cấm → Lưu PENDING
     */
    @Transactional
    public ReviewResponse createReview(String email, ReviewRequest request) {
        // 1. Xác thực user
        User user = userRepository.findByEmailManual(email)
                .orElseThrow(() -> new UnauthorizedException("Người dùng không tồn tại"));

        // 2. Kiểm tra phim tồn tại
        Movie movie = movieRepository.findById(request.getMovieId())
                .orElseThrow(() -> new MovieNotFoundException("Không tìm thấy phim với ID: " + request.getMovieId()));

        // 3. Kiểm tra đã mua phim chưa
        boolean hasPurchased = onlineTicketRepository.existsByMovieIdAndUserEmail(movie.getId(), email);
        if (!hasPurchased) {
            throw new NotPurchasedException("Bạn chưa mua phim này, không thể viết đánh giá");
        }

        // 4. Quy tắc 80%: watchedPercent phải >= 80
        if (request.getWatchedPercent() == null || request.getWatchedPercent() < 80) {
            throw new NotWatchedEnoughException("Bạn cần xem ít nhất 80% bộ phim để viết đánh giá");
        }

        // 5. Validate rating 1-5
        if (request.getRating() == null || request.getRating() < 1 || request.getRating() > 5) {
            throw new IllegalArgumentException("Số sao đánh giá phải từ 1 đến 5");
        }

        // 6. Kiểm tra giới hạn lượt đánh giá theo tổng số vé (bao gồm cả vé rạp để không bị kẹt vì review cũ)
        int onlineTicketCount = onlineTicketRepository.countByMovieIdAndUserEmail(movie.getId(), email);
        int cinemaTicketCount = ticketRepository.countTicketsByMovieIdAndUserEmail(movie.getId(), email);
        int ticketCount = onlineTicketCount + cinemaTicketCount;
        
        int reviewCount = movieReviewRepository.countByMovieIdAndUserId(movie.getId(), user.getId());
        if (reviewCount >= ticketCount) {
            throw new DuplicateReviewException("Mỗi vé xem phim chỉ được gửi một lượt đánh giá. Bạn đã sử dụng hết lượt đánh giá của mình.");
        }

        // 7. Kiểm duyệt: Lọc từ cấm thủ công
        String content = request.getContent().trim();
        BadWord matchedBadWord = getMatchedBadWord(content);

        boolean isSpam = false;
        boolean hasSpoiler = false;
        ReviewStatus status = ReviewStatus.ACTIVE;
        
        if (matchedBadWord != null) {
            if ("SPOILER".equalsIgnoreCase(matchedBadWord.getReason())) {
                hasSpoiler = true;
            } else {
                isSpam = true;
                status = ReviewStatus.HIDDEN;
            }
        }

        // 8. Lưu review
        MovieReview review = MovieReview.builder()
                .user(user)
                .movie(movie)
                .rating(request.getRating())
                .content(content)
                .hasSpoiler(hasSpoiler)
                .isSpam(isSpam)
                .status(status)
                .likeCount(0)
                .reportCount(isSpam || hasSpoiler ? 1 : 0) // Hệ thống tự tính là 1 report nếu vi phạm
                .build();

        MovieReview savedReview = movieReviewRepository.saveAndFlush(review);

        if (matchedBadWord != null) {
            // Tự động tạo ReviewReport ghi vết
            ReviewReport systemReport = ReviewReport.builder()
                    .review(savedReview)
                    .user(null) // user_id = null nghĩa là hệ thống
                    .reason(matchedBadWord.getReason() != null ? matchedBadWord.getReason() : "OTHER")
                    .subReason(matchedBadWord.getSubReason())
                    .details("Hệ thống tự động phát hiện vi phạm dựa trên từ khóa cấm: '" + matchedBadWord.getWord() + "'")
                    .status(ReportStatus.APPROVED)
                    .adminNote("Hệ thống tự động xử lý")
                    .build();
            reviewReportRepository.save(systemReport);

            if (hasSpoiler) {
                // Gửi thông báo Spoiler
                notificationService.sendNotification(
                        user,
                        "Đánh giá bị ẩn do Spoiler",
                        "Một đánh giá của bạn đã bị ẩn do hệ thống phát hiện chứa nội dung tiết lộ trước nội dung phim (Spoiler). Vui lòng lưu ý khi viết đánh giá.",
                        "/movie-details?id=" + savedReview.getMovie().getId(),
                        NotificationType.SYSTEM
                );
            } else {
                // Gửi thông báo Vi phạm khác
                user.setPenaltyPoints(user.getPenaltyPoints() + 1);
                userRepository.save(user);
                
                notificationService.sendNotification(
                        user,
                        "Cảnh cáo vi phạm tiêu chuẩn cộng đồng",
                        "Đánh giá của bạn chứa từ khóa vi phạm tiêu chuẩn cộng đồng và đã bị ẩn. Bạn bị cộng 1 điểm vi phạm.",
                        "/policy",
                        NotificationType.WARNING
                );
            }
        }

        ReviewResponse response = toResponse(savedReview, null);

        // Broadcast realtime
        messagingTemplate.convertAndSend("/topic/reviews/" + savedReview.getMovie().getId(), response);

        return response;
    }

    // ==================== GET REVIEWS (PAGINATED) ====================

    /**
     * Lấy danh sách review ACTIVE của 1 bộ phim theo trang (10 review/trang).
     * email=null nếu chưa login → likedByMe=false, reportedByMe=false
     */
    public Page<ReviewResponse> getMovieReviews(Long movieId, int page, String email) {
        if (!movieRepository.existsById(movieId)) {
            throw new MovieNotFoundException("Không tìm thấy phim với ID: " + movieId);
        }

        UUID currentUserId = null;
        if (email != null) {
            currentUserId = userRepository.findByEmailManual(email)
                    .map(User::getId)
                    .orElse(null);
        }

        final UUID finalUserId = currentUserId;
        Pageable pageable = PageRequest.of(page, 10, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<MovieReview> reviewPage;
        if (finalUserId != null) {
            reviewPage = movieReviewRepository.findByMovieIdAndStatusAndNotReportedByUser(movieId, ReviewStatus.ACTIVE, finalUserId, pageable);
        } else {
            reviewPage = movieReviewRepository.findByMovieIdAndStatus(movieId, ReviewStatus.ACTIVE, pageable);
        }
        return reviewPage.map(r -> toResponse(r, finalUserId));
    }


    // ==================== GET MY REVIEWS ====================

    public List<ReviewResponse> getMyReviews(String email, Long movieId) {
        User user = userRepository.findByEmailManual(email)
                .orElseThrow(() -> new UnauthorizedException("Người dùng không tồn tại"));

        return movieReviewRepository.findByMovieIdAndUserId(movieId, user.getId())
                .stream()
                .map(r -> toResponse(r, user.getId()))
                .collect(Collectors.toList());
    }

    public boolean canReview(String email, Long movieId) {
        User user = userRepository.findByEmailManual(email).orElse(null);
        if (user == null) return false;
        int onlineTicketCount = onlineTicketRepository.countByMovieIdAndUserEmail(movieId, email);
        int cinemaTicketCount = ticketRepository.countTicketsByMovieIdAndUserEmail(movieId, email);
        int ticketCount = onlineTicketCount + cinemaTicketCount;
        
        int reviewCount = movieReviewRepository.countByMovieIdAndUserId(movieId, user.getId());
        return ticketCount > reviewCount;
    }

    // ==================== REACTION (LIKE / DISLIKE) ====================

    /**
     * Toggle reaction một review (like hoặc dislike).
     */
    @Transactional
    public ReviewResponse toggleReaction(String email, ReviewReactionRequest request) {
        User user = userRepository.findByEmailManual(email)
                .orElseThrow(() -> new UnauthorizedException("Người dùng không tồn tại"));

        MovieReview review = movieReviewRepository.findById(request.getReviewId())
                .orElseThrow(() -> new ReviewNotFoundException("Không tìm thấy đánh giá"));

        ReviewLike existingReaction = reviewLikeRepository.findByReviewIdAndUserId(review.getId(), user.getId()).orElse(null);

        int currentLikeCount = review.getLikeCount() != null ? review.getLikeCount() : 0;
        int currentDislikeCount = review.getDislikeCount() != null ? review.getDislikeCount() : 0;

        if (existingReaction != null) {
            Boolean currentIsLike = existingReaction.getIsLike();
            if (currentIsLike == null) currentIsLike = true; // DB cũ mặc định là Like

            if (currentIsLike.equals(request.getIsLike())) {
                // Hủy reaction (nếu đang like mà bấm like, hoặc đang dislike mà bấm dislike)
                reviewLikeRepository.deleteByReviewIdAndUserId(review.getId(), user.getId());
                if (currentIsLike) {
                    review.setLikeCount(Math.max(0, currentLikeCount - 1));
                    review.setDislikeCount(currentDislikeCount);
                } else {
                    review.setDislikeCount(Math.max(0, currentDislikeCount - 1));
                    review.setLikeCount(currentLikeCount);
                }
            } else {
                // Đổi reaction (từ like sang dislike hoặc ngược lại)
                existingReaction.setIsLike(request.getIsLike());
                reviewLikeRepository.save(existingReaction);
                if (request.getIsLike()) {
                    review.setLikeCount(currentLikeCount + 1);
                    review.setDislikeCount(Math.max(0, currentDislikeCount - 1));
                } else {
                    review.setDislikeCount(currentDislikeCount + 1);
                    review.setLikeCount(Math.max(0, currentLikeCount - 1));
                }
            }
        } else {
            // Thêm mới reaction
            ReviewLike reaction = ReviewLike.builder()
                    .review(review)
                    .user(user)
                    .isLike(request.getIsLike())
                    .build();
            reviewLikeRepository.save(reaction);
            if (request.getIsLike()) {
                review.setLikeCount(currentLikeCount + 1);
                review.setDislikeCount(currentDislikeCount);
            } else {
                review.setDislikeCount(currentDislikeCount + 1);
                review.setLikeCount(currentLikeCount);
            }
        }

        MovieReview savedReview = movieReviewRepository.save(review);
        ReviewResponse responseForUser = toResponse(savedReview, user.getId());

        // Broadcast cập nhật realtime (Neutral response)
        ReviewResponse neutralResponse = toResponse(savedReview, null);
        messagingTemplate.convertAndSend("/topic/reviews/" + review.getMovie().getId(), neutralResponse);

        return responseForUser;
    }

    // ==================== REPORT ====================

    @Transactional
    public ReviewResponse markAsSpoiler(String email, UUID reviewId) {
        User user = userRepository.findByEmailManual(email)
                .orElseThrow(() -> new UnauthorizedException("Người dùng không tồn tại"));

        MovieReview review = movieReviewRepository.findById(reviewId)
                .orElseThrow(() -> new ReviewNotFoundException("Không tìm thấy đánh giá"));

        if (reviewReportRepository.existsByReviewIdAndUserId(review.getId(), user.getId())) {
            throw new DuplicateReviewException("Bạn đã gửi báo cáo cho đánh giá này rồi");
        }

        ReviewReport report = ReviewReport.builder()
                .review(review)
                .user(user)
                .reason("[SPOILER_REPORT] Đánh giá có chứa nội dung tiết lộ cốt truyện")
                .status(ReportStatus.PENDING)
                .build();
        reviewReportRepository.save(report);

        // Gửi thông báo cho Admin
        notificationService.sendSystemNotificationToAdmins(
                "Có báo cáo Spoil mới",
                "Người dùng " + user.getFullName() + " vừa gửi yêu cầu đánh dấu spoil một đánh giá. Vui lòng kiểm tra.",
                "/admin/reports",
                NotificationType.ADMIN_SYSTEM
        );

        return toResponse(review, user.getId());
    }

    /**
     * Báo cáo một review vi phạm.
     * Mỗi user chỉ báo cáo 1 lần cho 1 review.
     */
    @Transactional
    public ReviewResponse reportReview(String email, ReviewReportRequest request) {
        User user = userRepository.findByEmailManual(email)
                .orElseThrow(() -> new UnauthorizedException("Người dùng không tồn tại"));

        MovieReview review = movieReviewRepository.findById(request.getReviewId())
                .orElseThrow(() -> new ReviewNotFoundException("Không tìm thấy đánh giá"));

        // Kiểm tra đã báo cáo chưa
        if (reviewReportRepository.existsByReviewIdAndUserId(review.getId(), user.getId())) {
            throw new DuplicateReviewException("Bạn đã báo cáo đánh giá này rồi");
        }

        ReviewReport report = ReviewReport.builder()
                .review(review)
                .user(user)
                .reason(request.getReason())
                .subReason(request.getSubReason())
                .details(request.getDetails() != null ? request.getDetails().trim() : "")
                .status(ReportStatus.PENDING)
                .build();
        reviewReportRepository.save(report);

        // Gửi thông báo xác nhận cho người báo cáo
        notificationService.sendNotification(
                user,
                "Đã tiếp nhận báo cáo",
                "Cảm ơn bạn đã gửi báo cáo. Chúng tôi đã tiếp nhận và đang xem xét báo cáo của bạn.",
                null,
                NotificationType.SYSTEM
        );

        // Gửi thông báo cho Admin
        notificationService.sendSystemNotificationToAdmins(
                "Có báo cáo vi phạm mới",
                "Người dùng " + user.getFullName() + " vừa báo cáo một đánh giá. Vui lòng kiểm tra.",
                "/admin/reports",
                NotificationType.ADMIN_SYSTEM
        );

        int currentReportCount = review.getReportCount() != null ? review.getReportCount() : 0;
        review.setReportCount(currentReportCount + 1);
        MovieReview savedReview = movieReviewRepository.save(review);

        return toResponse(savedReview, user.getId());
    }

    // ==================== ADMIN REPORT MANAGEMENT ====================

    /**
     * Lấy danh sách báo cáo cho Admin
     */
    public Page<com.Cinema.movie_backend.DTO.ReviewReportAdminResponse> getAdminReports(int page) {
        Pageable pageable = PageRequest.of(page, 10, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<ReviewReport> reportsPage = reviewReportRepository.findAll(pageable);
        
        return reportsPage.map(report -> com.Cinema.movie_backend.DTO.ReviewReportAdminResponse.builder()
                .reportId(report.getId())
                .createdAt(report.getCreatedAt())
                .movieId(report.getReview().getMovie().getId())
                .movieTitle(report.getReview().getMovie().getTitle())
                .moviePosterUrl(report.getReview().getMovie().getPosterUrl())
                .reporterId(report.getUser().getId())
                .reporterName(report.getUser().getFullName())
                .reporterEmail(report.getUser().getEmail())
                .reportReason(report.getReason())
                .reportSubReason(report.getSubReason())
                .reportDetails(report.getDetails())
                .status(report.getStatus())
                .adminNote(report.getAdminNote())
                .isSpoilerReport(report.getReason() != null && ("SPOILER".equalsIgnoreCase(report.getReason()) || report.getReason().startsWith("[SPOILER_REPORT]")))
                .reviewId(report.getReview().getId())
                .reviewContent(report.getReview().getContent())
                .reviewRating(report.getReview().getRating())
                .reportedUserName(report.getReview().getUser().getFullName() != null ? report.getReview().getUser().getFullName() : report.getReview().getUser().getUsername())
                .reportedUserEmail(report.getReview().getUser().getEmail())
                .build());
    }

    /**
     * Admin xác nhận giải quyết báo cáo.
     */
    @Transactional
    public void processReport(UUID reportId, com.Cinema.movie_backend.DTO.ReviewReportProcessRequest request) {
        ReviewReport report = reviewReportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy báo cáo"));

        if (report.getStatus() != ReportStatus.PENDING) {
            throw new IllegalArgumentException("Báo cáo này đã được xử lý rồi");
        }

        boolean isApprove = "APPROVE".equalsIgnoreCase(request.getAction());
        boolean isSpoiler = "SPOILER".equalsIgnoreCase(request.getAction());
        ReportStatus newStatus = (isApprove || isSpoiler) ? ReportStatus.APPROVED : ReportStatus.REJECTED;

        // Xử lý tất cả các báo cáo PENDING của cùng 1 review này
        List<ReviewReport> relatedReports = reviewReportRepository.findByReviewIdAndStatus(report.getReview().getId(), ReportStatus.PENDING);
        
        for (ReviewReport r : relatedReports) {
            r.setStatus(newStatus);
            r.setAdminNote(request.getAdminNote());
            reviewReportRepository.save(r);

            // Gửi thông báo cho từng người báo cáo
            String title = (isApprove || isSpoiler) ? "Cập nhật: Báo cáo vi phạm" : "Cập nhật: Báo cáo không vi phạm";
            String message = (isApprove || isSpoiler) 
                ? "Báo cáo của bạn về đánh giá vi phạm đã được chúng tôi xác nhận và xử lý. Cảm ơn bạn đã giúp cộng đồng tốt đẹp hơn."
                : "Chúng tôi đã xem xét báo cáo của bạn nhưng nhận định đánh giá này không vi phạm tiêu chuẩn cộng đồng.";
            
            notificationService.sendNotification(r.getUser(), title, message, null, NotificationType.REPORT_RESULT);
        }

        // Nếu xác nhận vi phạm hoặc spoiler, tiến hành cập nhật trạng thái và thông báo
        if (isApprove || isSpoiler) {
            MovieReview review = report.getReview();
            if ("SPOILER".equals(report.getReason()) || isSpoiler) {
                review.setHasSpoiler(true);
            } else {
                review.setStatus(ReviewStatus.HIDDEN);
                User reviewer = review.getUser();
                reviewer.setPenaltyPoints(reviewer.getPenaltyPoints() + 1);
                userRepository.save(reviewer);
            }
            movieReviewRepository.save(review);

            // Broadcast realtime update to clients
            ReviewResponse neutralResponse = toResponse(review, null);
            messagingTemplate.convertAndSend("/topic/reviews/" + review.getMovie().getId(), neutralResponse);

            boolean isSpoilerReason = "SPOILER".equals(report.getReason()) || isSpoiler;
            String notifyTitle = isSpoilerReason ? "Đánh giá bị ẩn do Spoiler" : "Cảnh cáo vi phạm tiêu chuẩn cộng đồng";
            String notifyMessage = isSpoilerReason 
                ? "Một đánh giá của bạn đã bị ẩn do chứa nội dung tiết lộ trước nội dung phim (Spoiler). Vui lòng lưu ý khi viết đánh giá." 
                : "Một đánh giá của bạn đã bị gỡ bỏ do vi phạm tiêu chuẩn cộng đồng. Bạn bị cộng 1 điểm vi phạm. Vui lòng tuân thủ quy định để tránh bị hạn chế tài khoản.";
            NotificationType type = isSpoilerReason ? NotificationType.SYSTEM : NotificationType.WARNING;

            String notifyLink = "/movie-details?id=" + review.getMovie().getId() + "&highlightReview=" + review.getId();
            notificationService.sendNotification(
                    review.getUser(),
                    notifyTitle,
                    notifyMessage,
                    notifyLink,
                    type
            );
        }
    }

    /**
     * Kiểm tra nội dung có chứa từ cấm không và trả về từ cấm đó.
     */
    private BadWord getMatchedBadWord(String content) {
        if (content == null || content.isBlank()) return null;
        String lower = content.toLowerCase();
        List<BadWord> badWords = badWordRepository.findAll();
        for (BadWord bw : badWords) {
            if (lower.contains(bw.getWord().toLowerCase())) {
                return bw;
            }
        }
        return null;
    }

    /**
     * Convert entity → DTO.
     * currentUserId=null → likedByMe=false, reportedByMe=false
     */
    private ReviewResponse toResponse(MovieReview review, UUID currentUserId) {
        boolean likedByMe = false;
        boolean dislikedByMe = false;
        boolean reportedByMe = false;
        boolean reportedSpoilerByMe = false;

        if (currentUserId != null) {
            ReviewLike reaction = reviewLikeRepository.findByReviewIdAndUserId(review.getId(), currentUserId).orElse(null);
            if (reaction != null) {
                // Những like cũ trong DB có isLike = null, mặc định coi là Like (true)
                if (reaction.getIsLike() == null || reaction.getIsLike()) {
                    likedByMe = true;
                } else {
                    dislikedByMe = true;
                }
            }
            List<ReviewReport> reports = reviewReportRepository.findByReviewIdAndUserId(review.getId(), currentUserId);
            if (reports != null && !reports.isEmpty()) {
                reportedByMe = true;
                for (ReviewReport r : reports) {
                    if (r.getReason() != null && ("SPOILER".equalsIgnoreCase(r.getReason()) || r.getReason().startsWith("[SPOILER_REPORT]"))) {
                        reportedSpoilerByMe = true;
                        break;
                    }
                }
            }
        }

        return ReviewResponse.builder()
                .id(review.getId())
                .movieId(review.getMovie().getId())
                .username(review.getUser().getUsername())
                .fullName(review.getUser().getFullName())
                .avatar(review.getUser().getAvatar())
                .memberPoints(review.getUser().getMemberPoints() != null ? review.getUser().getMemberPoints() : 0)
                .membershipTier(review.getUser().getMembershipTier() != null ? review.getUser().getMembershipTier() : 0)
                .rating(review.getRating())
                .content(review.getContent())
                .hasSpoiler(review.getHasSpoiler())
                .isSpam(review.getIsSpam())
                .status(review.getStatus())
                .likeCount(review.getLikeCount() != null ? review.getLikeCount() : 0)
                .dislikeCount(review.getDislikeCount() != null ? review.getDislikeCount() : 0)
                .reportCount(review.getReportCount() != null ? review.getReportCount() : 0)
                .likedByMe(likedByMe)
                .dislikedByMe(dislikedByMe)
                .reportedByMe(reportedByMe)
                .reportedSpoilerByMe(reportedSpoilerByMe)
                .createdAt(review.getCreatedAt())
                .build();
    }
}
