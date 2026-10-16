package com.Cinema.movie_backend.config;

import com.Cinema.movie_backend.util.JwtUtil;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import jakarta.servlet.http.Cookie;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtUtil jwtUtil;
    private final com.Cinema.movie_backend.security.AuthenticationService authenticationService;
    private final com.Cinema.movie_backend.security.WebSocketAuthorizationService authorizationService;
    private final com.Cinema.movie_backend.security.WebSocketDeliveryGuard deliveryGuard;
    @org.springframework.beans.factory.annotation.Value("${app.cors.allowed-origins:http://localhost:3000,http://localhost:5173}")
    private String allowedOrigins;

    public WebSocketConfig(JwtUtil jwtUtil, com.Cinema.movie_backend.security.AuthenticationService authenticationService, com.Cinema.movie_backend.security.WebSocketAuthorizationService authorizationService, com.Cinema.movie_backend.security.WebSocketDeliveryGuard deliveryGuard) {
        this.jwtUtil = jwtUtil;
        this.authenticationService = authenticationService;
        this.authorizationService = authorizationService;
        this.deliveryGuard = deliveryGuard;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable a simple memory-based message broker to carry the messages back to the client on destinations prefixed with "/topic"
        config.enableSimpleBroker("/topic", "/queue");
        // Prefix for messages that are bound for @MessageMapping-annotated methods in controller class
        config.setApplicationDestinationPrefixes("/app");
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOrigins(java.util.Arrays.stream(allowedOrigins.split(",")).map(String::trim).toArray(String[]::new))
                .addInterceptors(new HandshakeInterceptor() {
                    @Override
                    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                            WebSocketHandler wsHandler, Map<String, Object> attributes) throws Exception {
                        if (request instanceof ServletServerHttpRequest servletRequest) {
                            Cookie[] cookies = servletRequest.getServletRequest().getCookies();
                            if (cookies != null) {
                                for (Cookie cookie : cookies) {
                                    if ("accessToken".equals(cookie.getName())) {
                                        String token = cookie.getValue();
                                        try {
                                            String email = jwtUtil.extractEmail(token);
                                            if (email != null) {
                                                authenticationService.authenticate(token);
                                                attributes.put("token", token);
                                            }
                                        } catch (Exception e) {
                                            // ignore
                                        }
                                    }
                                }
                            }
                        }
                        return true;
                    }

                    @Override
                    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                            WebSocketHandler wsHandler, Exception exception) {
                    }
                })
                .withSockJS();
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                if (accessor != null) {
                    Map<String, Object> attributes = accessor.getSessionAttributes();
                    String token = attributes != null ? (String) attributes.get("token") : null;
                    if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                        String bearer = accessor.getFirstNativeHeader("Authorization");
                        if (bearer != null && bearer.startsWith("Bearer ")) {
                            token = bearer.substring(7);
                            if (attributes != null) attributes.put("token", token);
                        }
                        if (token != null) accessor.setUser(authenticationService.authenticate(token));
                        deliveryGuard.connect(accessor.getSessionId(), token);
                    }
                    if (StompCommand.SEND.equals(accessor.getCommand()) || StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
                        Principal principal = token != null ? authenticationService.authenticate(token) : null;
                        authorizationService.authorize(accessor.getCommand().name(), accessor.getDestination(), principal);
                        if (principal != null) accessor.setUser(principal);
                        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) deliveryGuard.subscribe(accessor.getSessionId(), accessor.getSubscriptionId(), accessor.getDestination());
                    }
                    if (StompCommand.UNSUBSCRIBE.equals(accessor.getCommand())) deliveryGuard.unsubscribe(accessor.getSessionId(), accessor.getSubscriptionId());
                    if (StompCommand.DISCONNECT.equals(accessor.getCommand())) deliveryGuard.disconnect(accessor.getSessionId());
                }
                return message;
            }
        });
    }

    @Override public void configureClientOutboundChannel(ChannelRegistration registration) {
        registration.interceptors(deliveryGuard);
    }
}
