package com.Cinema.movie_backend.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import java.util.concurrent.ConcurrentHashMap;

/** Recheck private subscriptions at delivery, including idle sockets after expiry/role changes. */
@Component
@RequiredArgsConstructor
public class WebSocketDeliveryGuard implements ChannelInterceptor {
    private final AuthenticationService authentication;
    private final WebSocketAuthorizationService authorization;
    private record Session(String token, ConcurrentHashMap<String, String> subscriptions) {}
    private final ConcurrentHashMap<String, Session> sessions = new ConcurrentHashMap<>();

    public void connect(String id, String token) {
        if (id != null) sessions.put(id, new Session(token, new ConcurrentHashMap<>()));
    }
    public void subscribe(String id, String subscription, String destination) {
        var session = id == null ? null : sessions.get(id);
        if (session != null && subscription != null && destination != null) session.subscriptions().put(subscription, destination);
    }
    public void unsubscribe(String id, String subscription) {
        var session = id == null ? null : sessions.get(id);
        if (session != null && subscription != null) session.subscriptions().remove(subscription);
    }
    public void disconnect(String id) { if (id != null) sessions.remove(id); }
    @EventListener public void disconnected(SessionDisconnectEvent event) { disconnect(event.getSessionId()); }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        var headers = message.getHeaders();
        if (SimpMessageHeaderAccessor.getMessageType(headers) != SimpMessageType.MESSAGE) return message;
        var id = SimpMessageHeaderAccessor.getSessionId(headers);
        var session = id == null ? null : sessions.get(id);
        var subscription = SimpMessageHeaderAccessor.getSubscriptionId(headers);
        var destination = session == null || subscription == null ? null : session.subscriptions().get(subscription);
        if (destination == null) return null;
        try {
            // Public movie reviews remain available after an anonymous/expired login.
            if (destination.matches("/topic/reviews/[0-9]+")) return message;
            var principal = session.token() == null ? null : authentication.authenticate(session.token());
            authorization.authorize("SUBSCRIBE", destination, principal);
            return message;
        } catch (RuntimeException denied) { return null; }
    }
}
