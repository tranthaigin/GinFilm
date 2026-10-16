package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.DTO.ReviewResponse;
import com.Cinema.movie_backend.entity.MovieReview;
import com.Cinema.movie_backend.entity.ReviewStatus;
import com.Cinema.movie_backend.repository.MovieReviewRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Slf4j
@Service
@RequiredArgsConstructor
public class SpoilerCheckService {

    private final MovieReviewRepository movieReviewRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @org.springframework.beans.factory.annotation.Value("${gemini.api.key:${GEMINI_API_KEY:}}")
    private String geminiApiKey;
    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

    /**
     * Vòng 2: AI Kiểm tra spoiler - Chạy bất đồng bộ (@Async).
     * Nếu AI lỗi → fallback ACTIVE (không chặn review hợp lệ mãi mãi).
     */
    @Async
    public void checkSpoilerAsync(MovieReview review, ReviewResponse responseDto) {
        log.info("Bắt đầu check spoiler cho review ID: {}", review.getId());

        boolean hasSpoiler = false;
        try {
            hasSpoiler = callGeminiApi(review.getContent(), review.getMovie().getPlot());
            log.info("AI check hoàn tất. Spoiler: {}", hasSpoiler);
        } catch (Exception e) {
            log.error("AI check thất bại cho review ID: {}. Fallback ACTIVE. Lỗi: {}", review.getId(), e.getMessage());
            // Fallback: không phạt review hợp lệ do lỗi AI
            hasSpoiler = false;
        }

        // Re-fetch để tránh stale entity
        MovieReview currentReview = movieReviewRepository.findById(review.getId()).orElse(null);
        if (currentReview == null) {
            log.warn("Không tìm thấy review ID: {} trong DB khi cập nhật sau AI check.", review.getId());
            return;
        }

        currentReview.setHasSpoiler(hasSpoiler);
        currentReview.setStatus(ReviewStatus.ACTIVE);
        movieReviewRepository.save(currentReview);

        // Cập nhật DTO và push WebSocket
        responseDto.setHasSpoiler(hasSpoiler);
        responseDto.setStatus(ReviewStatus.ACTIVE);
        messagingTemplate.convertAndSend("/topic/reviews/" + currentReview.getMovie().getId(), responseDto);

        log.info("Review ID: {} đã được set ACTIVE và push WebSocket.", review.getId());
    }

    private boolean callGeminiApi(String content, String plot) throws Exception {
        if (geminiApiKey == null || geminiApiKey.isBlank()) throw new IllegalStateException("Gemini is not configured");
        String safeContent = content
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");

        String safePlot = (plot != null ? plot : "")
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");

        String prompt = "Chi tra loi duy nhat True hoac False (khong gi them). Dựa vào cốt truyện của phim: " + safePlot + "\\n\\nĐoạn văn sau có chứa nội dung tiết lộ tình tiết quan trọng của phim (spoiler) không?\\n\\nĐoạn văn: " + safeContent;

        String requestBody = "{\"contents\":[{\"parts\":[{\"text\":\"" + prompt + "\"}]}]}";

        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(GEMINI_API_URL))
                .header("Content-Type", "application/json")
                .header("x-goog-api-key", geminiApiKey)
                .timeout(Duration.ofSeconds(30))
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        log.info("Gemini API response status: {}", response.statusCode());

        if (response.statusCode() == 200 && response.body() != null) {
            String body = response.body().toLowerCase();
            log.info("Gemini response body (truncated): {}", body.substring(0, Math.min(200, body.length())));
            // Parse "text": "true" từ response JSON
            return body.contains("\"true\"") || body.contains("true");
        }

        log.warn("Gemini trả về lỗi HTTP {}: {}", response.statusCode(), response.body());
        throw new RuntimeException("Gemini API error: HTTP " + response.statusCode());
    }
}
