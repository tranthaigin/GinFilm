package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.DTO.NotificationResponse;
import com.Cinema.movie_backend.entity.Notification;
import com.Cinema.movie_backend.entity.NotificationType;
import com.Cinema.movie_backend.entity.User;
import com.Cinema.movie_backend.repository.NotificationRepository;
import com.Cinema.movie_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public void sendNotification(User user, String title, String message, String link, NotificationType type) {
        Notification notification = Notification.builder()
                .user(user)
                .title(title)
                .message(message)
                .link(link)
                .type(type)
                .isRead(false)
                .build();
        
        notification = notificationRepository.save(notification);
        
        NotificationResponse response = mapToResponse(notification);
        
        // Push qua WebSocket. User subscribe vào /user/queue/notifications
        // Cần truyền username hoặc email tuỳ thuộc vào cách Spring Security xác thực WebSocket
        messagingTemplate.convertAndSendToUser(user.getEmail(), "/queue/notifications", response);
    }

    @Transactional
    public void sendSystemNotificationToAdmins(String title, String message, String link, NotificationType type) {
        List<User> admins = userRepository.findAllAdmins();
        for (User admin : admins) {
            sendNotification(admin, title, message, link, type);
        }
    }

    public List<NotificationResponse> getUserNotifications(User user) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void markAsRead(UUID notificationId, User user) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Thông báo không tồn tại"));
        
        if (!notification.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Truy cập bị từ chối");
        }
        
        notification.setIsRead(true);
        notificationRepository.save(notification);
    }

    @Transactional
    public void markAllAsRead(User user) {
        List<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        for (Notification notif : notifications) {
            if (!notif.getIsRead()) {
                notif.setIsRead(true);
            }
        }
        notificationRepository.saveAll(notifications);
    }

    private NotificationResponse mapToResponse(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .link(notification.getLink())
                .type(notification.getType())
                .isRead(notification.getIsRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
