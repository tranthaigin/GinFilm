package com.Cinema.movie_backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@Slf4j
public class ApiLoggingFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String uri = request.getRequestURI();

        // Only log for /api/ routes
        if (uri != null && uri.startsWith("/api/")) {
            long startTime = System.currentTimeMillis();
            log.info("Incoming Request: [{}] {}", request.getMethod(), uri);

            try {
                filterChain.doFilter(request, response);
            } finally {
                long duration = System.currentTimeMillis() - startTime;
                log.info("Completed Request: [{}] {} with status {} in {} ms",
                        request.getMethod(), uri, response.getStatus(), duration);
            }
        } else {
            // For non-api routes, just proceed without custom INFO logging
            filterChain.doFilter(request, response);
        }
    }
}
