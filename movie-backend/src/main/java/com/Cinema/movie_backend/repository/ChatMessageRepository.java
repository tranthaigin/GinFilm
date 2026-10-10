package com.Cinema.movie_backend.repository;

import com.Cinema.movie_backend.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    /** Lấy toàn bộ lịch sử chat của 1 cuộc hội thoại (theo staffId) */
    List<ChatMessage> findByConversationIdOrderByCreatedAtAsc(UUID conversationId);

    /** Đếm tin nhắn chưa đọc từ staff (cho Admin) */
    long countByConversationIdAndIsReadFalseAndSenderRoleNot(UUID conversationId, String senderRole);

    /** Đếm tổng tin nhắn chưa đọc từ user/staff (badge tổng cho admin) */
    @Query("SELECT COUNT(m) FROM ChatMessage m WHERE m.isRead = false AND m.senderRole != 'ADMIN'")
    long countAllUnreadFromUsersAndStaff();

    /** Đếm tin nhắn chưa đọc từ admin (cho staff) */
    @Query("SELECT COUNT(m) FROM ChatMessage m WHERE m.conversationId = :convId AND m.isRead = false AND m.senderRole = 'ADMIN'")
    long countUnreadFromAdminForStaff(@Param("convId") UUID conversationId);

    /** Lấy danh sách cuộc hội thoại — mỗi conversationId + tin nhắn mới nhất */
    @Query("""
        SELECT m FROM ChatMessage m
        WHERE m.id = (
            SELECT MAX(m2.id) FROM ChatMessage m2
            WHERE m2.conversationId = m.conversationId
        )
        ORDER BY m.createdAt DESC
        """)
    List<ChatMessage> findLatestMessagePerConversation();

    /** Đánh dấu đã đọc tin nhắn của 1 cuộc hội thoại (theo role người nhận, truyền vào role của sender cần đánh dấu, nếu muốn đánh dấu tất cả có thể không dùng role hoặc truyền null, ở đây chúng ta truyền vào senderRole hoặc sửa logic) */
    @Modifying
    @Transactional
    @Query("UPDATE ChatMessage m SET m.isRead = true WHERE m.conversationId = :convId AND m.senderRole != 'ADMIN'")
    void markAsReadByAdmin(@Param("convId") UUID conversationId);
    
    @Modifying
    @Transactional
    @Query("UPDATE ChatMessage m SET m.isRead = true WHERE m.conversationId = :convId AND m.senderRole = 'ADMIN'")
    void markAsReadByUserOrStaff(@Param("convId") UUID conversationId);

    java.util.Optional<ChatMessage> findFirstByConversationIdOrderByCreatedAtDesc(UUID conversationId);

    /** Kiểm tra xem đã có tin nhắn tự động nào được gửi trong ngày chưa */
    boolean existsByConversationIdAndSenderNameAndCreatedAtAfter(UUID conversationId, String senderName, java.time.LocalDateTime createdAt);

    /** Xóa toàn bộ tin nhắn của một cuộc hội thoại */
    @Modifying
    @Transactional
    @Query("DELETE FROM ChatMessage m WHERE m.conversationId = :convId")
    void deleteByConversationId(@Param("convId") UUID conversationId);

    /** Xóa các tin nhắn cũ hơn 1 thời điểm nhất định (Chỉ xóa của ROLE_USER, giữ lại của STAFF/ADMIN) */
    @Modifying
    @Transactional
    @Query("DELETE FROM ChatMessage m WHERE m.createdAt < :cutoffTime AND m.conversationId IN (SELECT u.id FROM User u JOIN u.roles r WHERE r.name = 'ROLE_USER')")
    void deleteOldMessages(@Param("cutoffTime") java.time.LocalDateTime cutoffTime);
}
