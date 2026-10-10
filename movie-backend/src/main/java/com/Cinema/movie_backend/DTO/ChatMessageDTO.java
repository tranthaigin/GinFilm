package com.Cinema.movie_backend.DTO;

import com.Cinema.movie_backend.entity.ChatMessage;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessageDTO {

    private Long id;
    private UUID conversationId;
    private UUID senderId;
    private String senderName;
    private String senderRole;
    private UUID recipientId;
    private String content;
    private Boolean isRead;
    private LocalDateTime createdAt;
    
    // Additional fields for conversation list
    private String participantRole;
    private String participantName;
    private Long unreadCount;

    // Reply-to fields
    private Long replyToMessageId;
    private String replyToContent;
    private String replyToSenderName;

    /** Chuyển từ Entity → DTO */
    public static ChatMessageDTO fromEntity(ChatMessage entity) {
        return ChatMessageDTO.builder()
                .id(entity.getId())
                .conversationId(entity.getConversationId())
                .senderId(entity.getSenderId())
                .senderName(entity.getSenderName())
                .senderRole(entity.getSenderRole())
                .recipientId(entity.getRecipientId())
                .content(entity.getContent())
                .isRead(entity.getIsRead())
                .createdAt(entity.getCreatedAt())
                .replyToMessageId(entity.getReplyToMessageId())
                .replyToContent(entity.getReplyToContent())
                .replyToSenderName(entity.getReplyToSenderName())
                .build();
    }
}
