package com.Cinema.movie_backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final AuthenticationService authenticationService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String token = null;
        HttpServletRequest authenticatedRequest = request;
        String authorization = request.getHeader("Authorization");
        if (authorization != null && authorization.startsWith("Bearer ")) token = authorization.substring(7);
        else if (request.getCookies() != null) {
            for (var cookie : request.getCookies()) {
                if ("accessToken".equals(cookie.getName())) token = cookie.getValue();
            }
        }
        if (token != null && !token.isBlank()) {
            try {
                SecurityContextHolder.getContext().setAuthentication(authenticationService.authenticate(token));
                // Legacy controllers use @CookieValue. Use the same verified credential
                // as Spring Security, including when a stale cookie accompanies a Bearer token.
                final String verifiedToken = token;
                authenticatedRequest = new HttpServletRequestWrapper(request) {
                    @Override public Cookie[] getCookies() {
                        var cookies = new java.util.ArrayList<Cookie>();
                        if (super.getCookies() != null) {
                            for (Cookie cookie : super.getCookies()) {
                                if (!"accessToken".equals(cookie.getName())) cookies.add(cookie);
                            }
                        }
                        cookies.add(new Cookie("accessToken", verifiedToken));
                        return cookies.toArray(Cookie[]::new);
                    }
                };
            } catch (RuntimeException ignored) {
                SecurityContextHolder.clearContext();
            }
        }
        chain.doFilter(authenticatedRequest, response);
    }
}
