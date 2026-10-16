package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.DTO.ChatMessageDTO;
import com.Cinema.movie_backend.DTO.ChatSendRequest;
import com.Cinema.movie_backend.entity.ChatMessage;
import com.Cinema.movie_backend.repository.ChatMessageRepository;
import com.Cinema.movie_backend.entity.User;
import com.Cinema.movie_backend.repository.UserRepository;
import com.Cinema.movie_backend.service.ChatEncryptionService;
import com.Cinema.movie_backend.service.NotificationService;
import com.Cinema.movie_backend.entity.NotificationType;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Controller
@RequiredArgsConstructor
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final ChatEncryptionService chatEncryptionService;
    private final NotificationService notificationService;
    private final com.Cinema.movie_backend.service.ChatAccessService chatAccess;

    // Use a scheduled executor for auto-reply tasks
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);

    /**
     * Resolve reply-to fields: nếu có replyToMessageId, tìm tin gốc và lấy content
     * + senderName.
     * Trả về array [replyToContent (plain), replyToSenderName] hoặc [null, null].
     */
    private String[] resolveReplyTo(Long replyToMessageId, UUID conversationId) {
        if (replyToMessageId == null)
            return new String[] { null, null };
        return chatMessageRepository.findById(replyToMessageId)
                .filter(orig -> conversationId.equals(orig.getConversationId()))
                .map(orig -> new String[] {
                        chatEncryptionService.decrypt(orig.getContent()),
                        orig.getSenderName()
                })
                .orElse(new String[] { null, null });
    }

    /**
     * Staff/User gửi tin nhắn cho Admin.
     * Subscribe tại: /app/chat.send
     * Admin nhận tại: /topic/chat.admin
     * Staff/User cũng nhận lại confirm tại: /topic/chat.{conversationId}
     */
    @MessageMapping("/chat.send")
    public void sendMessage(@Payload ChatSendRequest request, java.security.Principal principal) {
        User sender = chatAccess.user(principal);
        if (chatAccess.admin(sender)) throw new org.springframework.security.access.AccessDeniedException("Use admin reply");
        UUID expected = sender.getId();
        if (chatAccess.staff(sender) && request.getRecipientId() != null) {
            User recipient = userRepository.findById(request.getRecipientId()).orElseThrow();
            chatAccess.requireAdmin(recipient);
            expected = chatAccess.pair(sender.getId(), recipient.getId());
        } else request.setRecipientId(null);
        if (!expected.equals(request.getConversationId())) throw new org.springframework.security.access.AccessDeniedException("Invalid conversation");
        request.setSenderId(sender.getId());
        request.setSenderName(sender.getFullName());
        request.setSenderRole(chatAccess.staff(sender) ? "STAFF" : "USER");
        if (request.getContent() == null || request.getContent().isBlank() || request.getContent().length() > 5000) throw new IllegalArgumentException("Invalid message");
        // Mã hóa nội dung trước khi lưu vào DB
        String encryptedContent = chatEncryptionService.encrypt(request.getContent());

        // Resolve reply-to
        String[] replyInfo = resolveReplyTo(request.getReplyToMessageId(), request.getConversationId());
        String replyToContent = replyInfo[0];
        String replyToSenderName = replyInfo[1];

        ChatMessage saved = chatMessageRepository.save(
                ChatMessage.builder()
                        .conversationId(request.getConversationId())
                        .senderId(request.getSenderId())
                        .senderName(request.getSenderName())
                        .senderRole(request.getSenderRole() != null ? request.getSenderRole() : "USER")
                        .recipientId(request.getRecipientId())
                        .content(encryptedContent) // lưu DB dạng đã mã hóa
                        .isRead(false)
                        .replyToMessageId(request.getReplyToMessageId())
                        .replyToContent(replyToContent != null ? chatEncryptionService.encrypt(replyToContent) : null)
                        .replyToSenderName(replyToSenderName)
                        .build());

        // Giải mã để gửi qua WebSocket cho client (frontend nhận plaintext)
        ChatMessageDTO dto = ChatMessageDTO.fromEntity(saved);
        dto.setContent(chatEncryptionService.decrypt(saved.getContent()));
        // Giải mã reply content nếu có
        if (saved.getReplyToContent() != null) {
            dto.setReplyToContent(chatEncryptionService.decrypt(saved.getReplyToContent()));
        }

        // Gửi đến kênh chung cho Admin
        messagingTemplate.convertAndSend(request.getRecipientId() == null ? "/topic/chat.admin" : "/topic/chat.admin." + request.getRecipientId(), dto);
        // Gửi lại confirm cho Staff/User (để hiện tin nhắn trong widget)
        messagingTemplate.convertAndSend("/topic/chat." + request.getConversationId(), dto);

        // Gửi thông báo Notification
        String roleStr = "STAFF".equals(request.getSenderRole()) ? "Nhân viên" : "Khách hàng";
        notificationService.sendSystemNotificationToAdmins("Tin nhắn mới", roleStr + " " + request.getSenderName() + " đã gửi tin nhắn cho bạn.", "/admin/chat", NotificationType.CHAT);

        // Lên lịch kiểm tra sau 15 giây xem admin đã trả lời chưa (chỉ áp dụng cho
        // USER)
        if ("USER".equals(request.getSenderRole()) || request.getSenderRole() == null) {
            scheduler.schedule(() -> {
                try {
                    // Kiểm tra tin nhắn mới nhất trong cuộc hội thoại
                    Optional<ChatMessage> latestMsgOpt = chatMessageRepository
                            .findFirstByConversationIdOrderByCreatedAtDesc(request.getConversationId());
                    if (latestMsgOpt.isPresent()) {
                        ChatMessage latestMsg = latestMsgOpt.get();
                        // Nếu tin nhắn mới nhất vẫn là của USER (Admin chưa trả lời)
                        if (!"ADMIN".equals(latestMsg.getSenderRole())) {
                            // Kiểm tra xem hệ thống đã gửi tin nhắn tự động nào trong ngày hôm nay chưa
                            java.time.LocalDateTime startOfDay = java.time.LocalDate.now().atStartOfDay();
                            boolean alreadySentToday = chatMessageRepository
                                    .existsByConversationIdAndSenderNameAndCreatedAtAfter(
                                            request.getConversationId(), "System", startOfDay);

                            if (!alreadySentToday) {
                                List<User> admins = userRepository.findAllAdmins();
                                String adminEmail = "admin@example.com";
                                String adminPhone = "Đang cập nhật";
                                String adminName = "Ban quản trị";
                                UUID adminId = request.getSenderId(); // Fallback to current sender ID if no admin found

                                if (!admins.isEmpty()) {
                                    User admin = admins.get(0);
                                    adminEmail = admin.getEmail();
                                    adminPhone = admin.getPhoneNumber();
                                    adminName = admin.getFullName();
                                    adminId = admin.getId();
                                }

                                String autoReplyPlain = " Xin chào! Cảm ơn bạn đã liên hệ với GinFilm. Tin nhắn của bạn đã được ghi nhận. Chúng tôi sẽ phản hồi trong thời gian sớm nhất có thể.\n"
                                        +
                                        " Nếu cần hỗ trợ khẩn cấp, vui lòng liên hệ trực tiếp:\n" +
                                        "• Điện thoại: " + adminPhone + "\n" +
                                        "• Email: " + adminEmail + "\n" +
                                        "Trân trọng, " + adminName;

                                // Mã hóa nội dung auto-reply trước khi lưu DB
                                String encryptedAutoReply = chatEncryptionService.encrypt(autoReplyPlain);

                                ChatMessage autoReply = chatMessageRepository.save(
                                        ChatMessage.builder()
                                                .conversationId(request.getConversationId())
                                                .senderId(adminId)
                                                .senderName("System")
                                                .senderRole("ADMIN")
                                                .content(encryptedAutoReply) // lưu DB dạng đã mã hóa
                                                .isRead(false)
                                                .build());

                                // Giải mã để gửi qua WebSocket
                                ChatMessageDTO autoReplyDto = ChatMessageDTO.fromEntity(autoReply);
                                autoReplyDto.setContent(autoReplyPlain);
                                messagingTemplate.convertAndSend("/topic/chat.admin", autoReplyDto);
                                messagingTemplate.convertAndSend("/topic/chat." + request.getConversationId(),
                                        autoReplyDto);
                            }
                        }
                    }
                } catch (Exception e) {
                    // Ignore exceptions in async task to not crash the thread
                    e.printStackTrace();
                }
            }, 15, TimeUnit.SECONDS);
        }
    }

    /**
     * Admin reply cho Staff/User.
     * Subscribe tại: /app/chat.reply
     * Staff/User nhận tại: /topic/chat.{conversationId}
     * Admin cũng nhận lại confirm tại: /topic/chat.admin
     */
    @MessageMapping("/chat.reply")
    public void replyMessage(@Payload ChatSendRequest request, java.security.Principal principal) {
        User sender = chatAccess.user(principal);
        chatAccess.requireAdmin(sender);
        chatAccess.requireConversation(request.getConversationId(), sender);
        request.setSenderId(sender.getId());
        request.setSenderName(sender.getFullName());
        request.setSenderRole("ADMIN");
        request.setRecipientId(chatMessageRepository.findByConversationIdOrderByCreatedAtAsc(request.getConversationId())
                .stream().findFirst().map(ChatMessage::getRecipientId).orElse(null));
        if (request.getContent() == null || request.getContent().isBlank() || request.getContent().length() > 5000) throw new IllegalArgumentException("Invalid message");
        // Mã hóa nội dung reply của Admin trước khi lưu DB
        String encryptedContent = chatEncryptionService.encrypt(request.getContent());

        // Resolve reply-to
        String[] replyInfo = resolveReplyTo(request.getReplyToMessageId(), request.getConversationId());
        String replyToContent = replyInfo[0];
        String replyToSenderName = replyInfo[1];

        ChatMessage saved = chatMessageRepository.save(
                ChatMessage.builder()
                        .conversationId(request.getConversationId())
                        .senderId(request.getSenderId())
                        .senderName(request.getSenderName())
                        .senderRole("ADMIN")
                        .recipientId(request.getRecipientId())
                        .content(encryptedContent) // lưu DB dạng đã mã hóa
                        .isRead(false)
                        .replyToMessageId(request.getReplyToMessageId())
                        .replyToContent(replyToContent != null ? chatEncryptionService.encrypt(replyToContent) : null)
                        .replyToSenderName(replyToSenderName)
                        .build());

        // Giải mã để gửi qua WebSocket cho client
        ChatMessageDTO dto = ChatMessageDTO.fromEntity(saved);
        dto.setContent(chatEncryptionService.decrypt(saved.getContent()));
        // Giải mã reply content nếu có
        if (saved.getReplyToContent() != null) {
            dto.setReplyToContent(chatEncryptionService.decrypt(saved.getReplyToContent()));
        }

        // Gửi đến kênh riêng của Staff/User
        messagingTemplate.convertAndSend("/topic/chat." + request.getConversationId(), dto);
        // Gửi lại admin panel để cập nhật UI
        messagingTemplate.convertAndSend(request.getRecipientId() == null ? "/topic/chat.admin" : "/topic/chat.admin." + request.getRecipientId(), dto);

        // Gửi thông báo Notification
        User recipient = userRepository.findById(request.getConversationId()).orElse(null);
        if (recipient != null) {
            notificationService.sendNotification(recipient, "Tin nhắn mới", "Ban quản trị đã gửi tin nhắn cho bạn.", "#", NotificationType.CHAT);
        }
    }
}
