package com.Cinema.movie_backend.DTO;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class AdminOnlineTicketDto {
    private Long id;
    private String ticketCode;
    private Double price;
    private LocalDateTime purchaseTime;
    private LocalDateTime activatedAt;
    private LocalDateTime expiresAt;
    private Integer timeLimitMinutes;
    private Integer consumedTimeSeconds;
    private Boolean isBanned;
    private String currentSessionToken;
    private String ipAddress;
    private Boolean isPlaying;
    private Integer watchPosition;
    
    // Thông tin User (Chủ vé)
    private UserDto user;
    
    // Thông tin người đang xem
    private UserDto currentViewer;
    
    // Thông tin phim
    private MovieDto movie;

    @Data
    @Builder
    public static class UserDto {
        private String id;
        private String fullName;
        private String email;
    }

    @Data
    @Builder
    public static class MovieDto {
        private Long id;
        private String title;
        private String posterUrl;
    }
}
