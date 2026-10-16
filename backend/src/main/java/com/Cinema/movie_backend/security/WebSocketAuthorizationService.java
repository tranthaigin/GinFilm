package com.Cinema.movie_backend.security;

import com.Cinema.movie_backend.service.ChatAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import java.security.Principal;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WebSocketAuthorizationService {
    private final ChatAccessService chat;

    public void authorize(String command, String destination, Principal principal) {
        if ("SUBSCRIBE".equals(command) && destination != null && destination.matches("/topic/reviews/[0-9]+")) return;
        var user = chat.user(principal);
        if ("SEND".equals(command)) {
            if ("/app/chat.reply".equals(destination)) { chat.requireAdmin(user); return; }
            if ("/app/chat.send".equals(destination) && !chat.admin(user)) return;
        } else if ("SUBSCRIBE".equals(command)) {
            if ("/user/queue/notifications".equals(destination)) return;
            if ("/topic/chat.admin".equals(destination) || "/topic/admin/tickets".equals(destination)) { chat.requireAdmin(user); return; }
            if (("/topic/chat.admin." + user.getId()).equals(destination)) { chat.requireAdmin(user); return; }
            if (destination != null && destination.startsWith("/topic/chat.")) {
                try { chat.requireConversation(UUID.fromString(destination.substring("/topic/chat.".length())), user); return; }
                catch (IllegalArgumentException ignored) { }
            }
        }
        throw new AccessDeniedException("WebSocket destination denied");
    }
}
