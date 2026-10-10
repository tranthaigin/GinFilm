package com.Cinema.movie_backend.scheduler;

import com.Cinema.movie_backend.repository.ChatMessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class ChatCleanupTask {

    private final ChatMessageRepository chatMessageRepository;

    /**
     * Chạy tự động mỗi ngày vào lúc 3h00 sáng.
     * Xóa toàn bộ các tin nhắn chat cũ hơn 24 tiếng để giảm tải database.
     */
    @Scheduled(cron = "0 0 3 * * ?")
    public void cleanupOldChatMessages() {
        log.info("Bắt đầu dọn dẹp các đoạn chat cũ...");
        try {
            LocalDateTime cutoffTime = LocalDateTime.now().minusHours(24);
            chatMessageRepository.deleteOldMessages(cutoffTime);
            log.info("Đã hoàn thành dọn dẹp các đoạn chat cũ hơn {}", cutoffTime);
        } catch (Exception e) {
            log.error("Lỗi trong quá trình dọn dẹp chat: {}", e.getMessage());
        }
    }
}
