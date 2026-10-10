package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.DTO.ChatMessageDTO;
import com.Cinema.movie_backend.entity.ChatMessage;
import com.Cinema.movie_backend.entity.ConversationAssignment;
import com.Cinema.movie_backend.repository.ChatMessageRepository;
import com.Cinema.movie_backend.repository.ConversationAssignmentRepository;
import com.Cinema.movie_backend.repository.UserRepository;
import com.Cinema.movie_backend.entity.User;
import com.Cinema.movie_backend.DTO.UserResponse;
import com.Cinema.movie_backend.service.ChatEncryptionService;
import com.Cinema.movie_backend.service.AiChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatRestController {

    private final ChatMessageRepository chatMessageRepository;
    private final ChatEncryptionService chatEncryptionService;
    private final AiChatService aiChatService;
    private final ConversationAssignmentRepository assignmentRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public static class AiRequest {
        public String message;
    }

    /**
     * Endpoint gọi AI chatbot (hoàn toàn tách biệt khỏi DB).
     */
    @PostMapping("/ai/send")
    public ResponseEntity<Map<String, Object>> sendToAi(@RequestBody AiRequest request) {
        if (request == null || request.message == null || request.message.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Message cannot be empty"));
        }
        Map<String, Object> aiResponse = aiChatService.generateResponse(request.message);
        return ResponseEntity.ok(aiResponse);
    }

    /**
     * Lấy lịch sử chat của 1 cuộc hội thoại (theo staffId / conversationId).
     * Dùng cho cả Staff (load lịch sử khi mở widget) và Admin (load khi chọn conv).
     */
    @GetMapping("/history/{conversationId}")
    public ResponseEntity<List<ChatMessageDTO>> getHistory(@PathVariable UUID conversationId) {
        List<ChatMessageDTO> history = chatMessageRepository
                .findByConversationIdOrderByCreatedAtAsc(conversationId)
                .stream()
                .map(msg -> {
                    ChatMessageDTO dto = ChatMessageDTO.fromEntity(msg);
                    // Giải mã nội dung trước khi trả về client
                    dto.setContent(chatEncryptionService.decrypt(msg.getContent()));
                    if (msg.getReplyToContent() != null) {
                        dto.setReplyToContent(chatEncryptionService.decrypt(msg.getReplyToContent()));
                    }
                    return dto;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(history);
    }

    /**
     * Tạo UUID cố định cho cặp Staff-Admin để làm conversationId.
     */
    @GetMapping("/conversation-id")
    public ResponseEntity<Map<String, UUID>> getConversationId(
            @RequestParam UUID staffId,
            @RequestParam UUID adminId) {
        String combined = (staffId.compareTo(adminId) < 0) 
                ? staffId.toString() + "_" + adminId.toString()
                : adminId.toString() + "_" + staffId.toString();
        UUID conversationId = UUID.nameUUIDFromBytes(combined.getBytes());
        return ResponseEntity.ok(Map.of("conversationId", conversationId));
    }

    /**
     * Lấy danh sách tất cả Admin (dành cho Staff chọn người để chat).
     */
    @GetMapping("/admins")
    public ResponseEntity<List<UserResponse>> getAllAdmins() {
        List<UserResponse> admins = userRepository.findAllAdmins()
                .stream()
                .map(UserResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(admins);
    }

    /**
     * Danh sách cuộc hội thoại (Admin view).
     * Trả về tin nhắn mới nhất của mỗi conversation.
     * @param adminId ID của Admin đang request (để filter các chat 1-1 của Staff gửi đích danh).
     */
    @GetMapping("/conversations")
    public ResponseEntity<List<ChatMessageDTO>> getConversations(@RequestParam(required = false) UUID adminId) {
        List<ChatMessageDTO> conversations = chatMessageRepository
                .findLatestMessagePerConversation()
                .stream()
                .map(msg -> {
                    ChatMessageDTO dto = ChatMessageDTO.fromEntity(msg);
                    // Giải mã nội dung tin nhắn mới nhất (hiển thị preview)
                    dto.setContent(chatEncryptionService.decrypt(msg.getContent()));
                    if (msg.getReplyToContent() != null) {
                        dto.setReplyToContent(chatEncryptionService.decrypt(msg.getReplyToContent()));
                    }
                    chatMessageRepository.findByConversationIdOrderByCreatedAtAsc(msg.getConversationId())
                        .stream().findFirst().ifPresent(firstMsg -> {
                            dto.setParticipantRole(firstMsg.getSenderRole());
                            dto.setParticipantName(firstMsg.getSenderName());
                        });
                    long unreadCount = chatMessageRepository.countByConversationIdAndIsReadFalseAndSenderRoleNot(msg.getConversationId(), "ADMIN");
                    dto.setUnreadCount(unreadCount);
                    return dto;
                })
                .filter(dto -> {
                    // Lọc: Nếu tin nhắn có recipientId, thì chỉ admin có ID tương ứng mới được xem
                    if (dto.getRecipientId() != null) {
                        return adminId != null && dto.getRecipientId().equals(adminId);
                    }
                    // Các tin nhắn thông thường (USER chat) thì mọi admin đều thấy
                    return true;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(conversations);
    }

    /**
     * Đánh dấu đã đọc — Admin đọc tin từ Staff trong conversation này.
     */
    @PatchMapping("/read/{conversationId}/staff")
    public ResponseEntity<Map<String, String>> markStaffMessagesRead(@PathVariable UUID conversationId) {
        chatMessageRepository.markAsReadByAdmin(conversationId);
        return ResponseEntity.ok(Map.of("message", "Đã đánh dấu đã đọc"));
    }

    /**
     * Đánh dấu đã đọc — Staff đọc tin từ Admin trong conversation này.
     */
    @PatchMapping("/read/{conversationId}/admin")
    public ResponseEntity<Map<String, String>> markAdminMessagesRead(@PathVariable UUID conversationId) {
        chatMessageRepository.markAsReadByUserOrStaff(conversationId);
        return ResponseEntity.ok(Map.of("message", "Đã đánh dấu đã đọc"));
    }

    /**
     * Đếm tổng tin chưa đọc từ Staff (cho badge của Admin).
     */
    @GetMapping("/unread/admin-total")
    public ResponseEntity<Map<String, Long>> getAdminUnreadTotal() {
        long count = chatMessageRepository.countAllUnreadFromUsersAndStaff();
        return ResponseEntity.ok(Map.of("count", count));
    }

    /**
     * Đếm tin chưa đọc từ Admin cho 1 Staff cụ thể (cho badge Staff widget).
     */
    @GetMapping("/unread/staff/{conversationId}")
    public ResponseEntity<Map<String, Long>> getStaffUnreadCount(@PathVariable UUID conversationId) {
        long count = chatMessageRepository.countUnreadFromAdminForStaff(conversationId);
        return ResponseEntity.ok(Map.of("count", count));
    }

    /**
     * Lấy tất cả assignment hiện tại (khi Admin load trang chat)
     */
    @GetMapping("/assignments")
    public ResponseEntity<List<Map<String, Object>>> getAllAssignments() {
        List<Map<String, Object>> result = assignmentRepository.findAll().stream()
            .map(a -> Map.<String, Object>of(
                "conversationId", a.getConversationId().toString(),
                "assignedAdminId", a.getAssignedAdminId().toString(),
                "assignedAdminName", a.getAssignedAdminName()
            ))
            .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    /**
     * Admin tiếp nhận một conversation
     */
    @PostMapping("/assign/{conversationId}")
    public ResponseEntity<Map<String, Object>> assignConversation(
            @PathVariable UUID conversationId,
            @RequestBody Map<String, String> body) {
        String adminIdStr = body.get("adminId");
        String adminName = body.get("adminName");
        if (adminIdStr == null || adminName == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "adminId and adminName required"));
        }
        UUID adminId = UUID.fromString(adminIdStr);

        // Nếu đã có ai nhận rồi thì từ chối
        if (assignmentRepository.findByConversationId(conversationId).isPresent()) {
            return ResponseEntity.status(409).body(Map.of("error", "Conversation đã được tiếp nhận bởi admin khác"));
        }

        ConversationAssignment assignment = ConversationAssignment.builder()
            .conversationId(conversationId)
            .assignedAdminId(adminId)
            .assignedAdminName(adminName)
            .build();
        assignmentRepository.save(assignment);

        // Broadcast cho tất cả admin biết
        Map<String, Object> event = Map.of(
            "type", "ASSIGNMENT_UPDATE",
            "conversationId", conversationId.toString(),
            "assignedAdminId", adminId.toString(),
            "assignedAdminName", adminName,
            "action", "ASSIGNED"
        );
        messagingTemplate.convertAndSend("/topic/chat.admin", (Object) event);

        return ResponseEntity.ok(event);
    }

    /**
     * Admin bỏ tiếp nhận (chỉ admin đã nhận mới được hủy)
     */
    @PostMapping("/unassign/{conversationId}")
    public ResponseEntity<Map<String, Object>> unassignConversation(
            @PathVariable UUID conversationId,
            @RequestBody Map<String, String> body) {
        String adminIdStr = body.get("adminId");
        if (adminIdStr == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "adminId required"));
        }
        UUID adminId = UUID.fromString(adminIdStr);

        ConversationAssignment assignment = assignmentRepository.findByConversationId(conversationId).orElse(null);
        if (assignment == null) {
            return ResponseEntity.ok(Map.of("message", "Không có assignment"));
        }
        // Chỉ admin đã tiếp nhận mới được hủy
        if (!assignment.getAssignedAdminId().equals(adminId)) {
            return ResponseEntity.status(403).body(Map.of("error", "Không có quyền hủy assignment này"));
        }
        assignmentRepository.deleteByConversationId(conversationId);

        // Broadcast hủy cho tất cả admin
        Map<String, Object> event = Map.of(
            "type", "ASSIGNMENT_UPDATE",
            "conversationId", conversationId.toString(),
            "action", "UNASSIGNED"
        );
        messagingTemplate.convertAndSend("/topic/chat.admin", (Object) event);

        return ResponseEntity.ok(event);
    }
}
