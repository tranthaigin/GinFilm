package com.Cinema.movie_backend.security;

import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class WebSocketDeliveryGuardTest {
    AuthenticationService authentication = mock(AuthenticationService.class);
    WebSocketAuthorizationService authorization = mock(WebSocketAuthorizationService.class);
    WebSocketDeliveryGuard guard = new WebSocketDeliveryGuard(authentication, authorization);
    Message<?> message() {
        var accessor = SimpMessageHeaderAccessor.create(SimpMessageType.MESSAGE);
        accessor.setSessionId("session"); accessor.setSubscriptionId("private-subscription");
        accessor.setDestination("/queue/notifications-user-session");
        return MessageBuilder.createMessage("payload", accessor.getMessageHeaders());
    }
    @Test void expiredTokenCannotReceiveFurtherPrivateMessages() {
        guard.connect("session", "token"); guard.subscribe("session", "private-subscription", "/user/queue/notifications");
        when(authentication.authenticate("token")).thenThrow(new IllegalArgumentException("expired"));
        assertNull(guard.preSend(message(), null));
    }
    @Test void revokedRoleStopsExistingSubscription() {
        guard.connect("session", "token"); guard.subscribe("session", "private-subscription", "/topic/admin/tickets");
        var principal = UsernamePasswordAuthenticationToken.authenticated("user", null, List.of());
        when(authentication.authenticate("token")).thenReturn(principal);
        doThrow(new org.springframework.security.access.AccessDeniedException("role changed")).when(authorization).authorize("SUBSCRIBE", "/topic/admin/tickets", principal);
        assertNull(guard.preSend(message(), null));
    }
    @Test void notificationQueueUsesOriginalSubscriptionDestination() {
        guard.connect("session", "token"); guard.subscribe("session", "private-subscription", "/user/queue/notifications");
        var principal = UsernamePasswordAuthenticationToken.authenticated("user", null, List.of());
        when(authentication.authenticate("token")).thenReturn(principal);
        var message = message(); assertSame(message, guard.preSend(message, null));
        verify(authorization).authorize("SUBSCRIBE", "/user/queue/notifications", principal);
        guard.unsubscribe("session", "private-subscription"); assertNull(guard.preSend(message, null));
    }
    @Test void anonymousPublicReviewsRemainAvailable() {
        guard.connect("session", null); guard.subscribe("session", "private-subscription", "/topic/reviews/1");
        var message = message(); assertSame(message, guard.preSend(message, null)); verifyNoInteractions(authentication);
        guard.disconnect("session"); assertNull(guard.preSend(message, null));
    }
}
