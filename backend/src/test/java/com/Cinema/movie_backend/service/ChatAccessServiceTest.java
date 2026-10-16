package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.entity.*;
import com.Cinema.movie_backend.repository.*;
import com.Cinema.movie_backend.security.WebSocketAuthorizationService;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class ChatAccessServiceTest {
    UserRepository users = mock(UserRepository.class);
    ChatMessageRepository messages = mock(ChatMessageRepository.class);
    ChatAccessService access = new ChatAccessService(users, messages);
    User user(String roleName) {
        User user = new User(); user.setId(UUID.randomUUID()); user.setEmail(user.getId() + "@example.com");
        Role role = new Role(); role.setName(roleName); user.setRoles(Set.of(role));
        when(users.findByEmailManual(user.getEmail())).thenReturn(Optional.of(user)); return user;
    }
    @Test void customerCannotReadAnotherConversation() {
        User owner = user("USER"), other = user("USER"); UUID id = owner.getId();
        when(messages.findByConversationIdOrderByCreatedAtAsc(id)).thenReturn(List.of(ChatMessage.builder().senderId(owner.getId()).build()));
        assertThrows(org.springframework.security.access.AccessDeniedException.class, () -> access.requireConversation(id, other));
    }
    @Test void privateStaffChatHiddenFromOtherAdmin() {
        User owner = user("STAFF"), admin = user("ADMIN"), other = user("ADMIN"); UUID id = access.pair(owner.getId(), admin.getId());
        when(messages.findByConversationIdOrderByCreatedAtAsc(id)).thenReturn(List.of(ChatMessage.builder().senderId(owner.getId()).recipientId(admin.getId()).build()));
        assertDoesNotThrow(() -> access.requireConversation(id, admin));
        assertThrows(org.springframework.security.access.AccessDeniedException.class, () -> access.requireConversation(id, other));
    }
    @Test void customerCannotSubscribeToAdminFeed() {
        User customer = user("USER"); var policy = new WebSocketAuthorizationService(access);
        assertThrows(org.springframework.security.access.AccessDeniedException.class, () -> policy.authorize("SUBSCRIBE", "/topic/chat.admin", () -> customer.getEmail()));
    }
    @Test void customerCannotSendAdminReply() {
        User customer = user("USER"); var policy = new WebSocketAuthorizationService(access);
        assertThrows(org.springframework.security.access.AccessDeniedException.class, () -> policy.authorize("SEND", "/app/chat.reply", () -> customer.getEmail()));
    }
    @Test void anonymousCanOnlySubscribeToPublicReviews() {
        var policy = new WebSocketAuthorizationService(access);
        assertDoesNotThrow(() -> policy.authorize("SUBSCRIBE", "/topic/reviews/1", null));
        assertThrows(org.springframework.security.access.AccessDeniedException.class, () -> policy.authorize("SEND", "/topic/reviews/1", null));
        assertThrows(org.springframework.security.access.AccessDeniedException.class, () -> policy.authorize("SUBSCRIBE", "/topic/chat.admin", null));
    }
}
