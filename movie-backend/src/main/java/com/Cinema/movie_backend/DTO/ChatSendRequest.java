package com.Cinema.movie_backend.DTO;

import lombok.*;

import java.util.UUID;

/**
 * Request payload khi staff hoặc admin gửi tin nhắn qua WebSocket.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatSendRequest {

    /** UUID của staff (= conversationId) */
    private UUID conversationId;

    /** UUID của người gửi */
    private UUID senderId;

    /** Tên hiển thị */
    private String senderName;

    /** STAFF hoặc ADMIN */
    private String senderRole;

    /** Nội dung tin nhắn */
    private String content;

    /** ID của người nhận (nếu chat 1-1) */
    private UUID recipientId;

    /** ID của tin nhắn được reply (null nếu không phải reply) */
    private Long replyToMessageId;
}
