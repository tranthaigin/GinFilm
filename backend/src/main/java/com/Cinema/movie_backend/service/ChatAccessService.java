package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.entity.User;
import com.Cinema.movie_backend.repository.ChatMessageRepository;
import com.Cinema.movie_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import java.security.Principal;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatAccessService {
    private final UserRepository users;
    private final ChatMessageRepository messages;

    public User user(Principal principal) {
        if (principal == null) throw new AccessDeniedException("Login required");
        return users.findByEmailManual(principal.getName()).orElseThrow(() -> new AccessDeniedException("Account unavailable"));
    }

    public boolean admin(User user) { return user.getRoles().stream().anyMatch(r -> r.getName().equals("ADMIN") || r.getName().equals("ROLE_ADMIN")); }
    public boolean staff(User user) { return user.getRoles().stream().anyMatch(r -> r.getName().equals("STAFF") || r.getName().equals("ROLE_STAFF")); }

    public UUID pair(UUID first, UUID second) {
        String combined = first.compareTo(second) < 0 ? first + "_" + second : second + "_" + first;
        return UUID.nameUUIDFromBytes(combined.getBytes(StandardCharsets.UTF_8));
    }

    public void requireConversation(UUID id, User user) {
        if (id == null) throw new AccessDeniedException("Conversation required");
        var history = messages.findByConversationIdOrderByCreatedAtAsc(id);
        if (!history.isEmpty()) {
            var first = history.getFirst();
            if (first.getRecipientId() != null) {
                if (user.getId().equals(first.getRecipientId()) || user.getId().equals(first.getSenderId())) return;
            } else if (admin(user) || user.getId().equals(first.getSenderId())) return;
            throw new AccessDeniedException("Conversation belongs to another account");
        }
        if (admin(user) || user.getId().equals(id)) return;
        if (staff(user) && users.findAllAdmins().stream().anyMatch(a -> pair(user.getId(), a.getId()).equals(id))) return;
        throw new AccessDeniedException("Conversation belongs to another account");
    }

    public void requireAdmin(User user) { if (!admin(user)) throw new AccessDeniedException("Admin required"); }
}
