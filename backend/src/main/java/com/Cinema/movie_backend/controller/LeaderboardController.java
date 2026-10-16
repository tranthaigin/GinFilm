package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.DTO.LeaderboardResponse;
import com.Cinema.movie_backend.entity.User;
import com.Cinema.movie_backend.service.LeaderboardService;
import com.Cinema.movie_backend.service.UserService;
import com.Cinema.movie_backend.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/public/leaderboard")
@RequiredArgsConstructor
public class LeaderboardController {
    private final LeaderboardService leaderboardService;
    private final JwtUtil jwtUtil;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<LeaderboardResponse> getLeaderboard(
            @RequestParam(defaultValue = "week") String period,
            @CookieValue(value = "accessToken", required = false) String token) {
        UUID currentUserId = null;
        if (token != null && !token.isBlank()) {
            try {
                User user = userService.findByEmail(jwtUtil.extractEmail(token));
                currentUserId = user == null ? null : user.getId();
            } catch (RuntimeException ignored) {
                // Bảng xếp hạng là công khai; token cũ chỉ làm mất phần hạng cá nhân.
            }
        }
        return ResponseEntity.ok(leaderboardService.getLeaderboard(period, currentUserId));
    }
}
