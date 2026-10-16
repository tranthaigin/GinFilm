package com.Cinema.movie_backend.DTO;

import com.Cinema.movie_backend.entity.NotificationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {
    private UUID id;
    private String title;
    private String message;
    private String link;
    private NotificationType type;
    private Boolean isRead;
    private LocalDateTime createdAt;
}
