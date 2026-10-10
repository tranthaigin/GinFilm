package com.Cinema.movie_backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "chat_messages", indexes = {
    @Index(name = "idx_chat_conversation", columnList = "conversation_id"),
    @Index(name = "idx_chat_created_at", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** ID của staff — dùng làm conversation ID */
    @Column(name = "conversation_id", nullable = false)
    private UUID conversationId;

    /** ID người gửi (staff hoặc admin) */
    @Column(name = "sender_id", nullable = false)
    private UUID senderId;

    @Column(name = "sender_name", length = 150, nullable = false)
    private String senderName;

    /** STAFF hoặc ADMIN */
    @Column(name = "sender_role", length = 20, nullable = false)
    private String senderRole;

    /** ID của người nhận nếu đây là chat 1-1 (VD: Staff nhắn đích danh cho Admin) */
    @Column(name = "recipient_id")
    private UUID recipientId;

    @Column(name = "content", columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(name = "is_read", nullable = false)
    private Boolean isRead = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    /** ID của tin nhắn được reply (null nếu không phải reply) */
    @Column(name = "reply_to_message_id")
    private Long replyToMessageId;

    /** Nội dung preview của tin nhắn gốc (lưu để không cần join) */
    @Column(name = "reply_to_content", columnDefinition = "TEXT")
    private String replyToContent;

    /** Tên người gửi tin nhắn gốc */
    @Column(name = "reply_to_sender_name", length = 150)
    private String replyToSenderName;
}
