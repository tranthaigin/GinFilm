package com.Cinema.movie_backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.net.URI;
import java.util.Set;

/** Cookie mutations must originate from the configured frontend (including login CSRF). */
public class CookieOriginFilter extends OncePerRequestFilter {
    private final Set<String> allowedOrigins;
    public CookieOriginFilter(Set<String> allowedOrigins) { this.allowedOrigins = allowedOrigins; }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        boolean mutation = !Set.of("GET", "HEAD", "OPTIONS").contains(request.getMethod());
        String origin = request.getHeader("Origin");
        String referer = request.getHeader("Referer");
        boolean hasCookie = request.getCookies() != null && request.getCookies().length > 0;
        boolean bearer = request.getHeader("Authorization") != null && request.getHeader("Authorization").startsWith("Bearer ");
        if (mutation && !bearer && (origin != null || hasCookie)) {
            if (origin == null && referer != null) {
                try { URI uri = URI.create(referer); origin = uri.getScheme() + "://" + uri.getRawAuthority(); }
                catch (IllegalArgumentException ignored) { }
            }
            if (!allowedOrigins.contains(origin)) {
                response.sendError(403, "Untrusted request origin");
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
