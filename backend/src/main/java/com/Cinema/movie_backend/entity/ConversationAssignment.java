package com.Cinema.movie_backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "conversation_assignments", indexes = {
    @Index(name = "idx_assign_conv_id", columnList = "conversation_id", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConversationAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** ID của conversation (trùng với conversationId trong ChatMessage) */
    @Column(name = "conversation_id", nullable = false, unique = true)
    private UUID conversationId;

    /** ID của admin đang tiếp nhận */
    @Column(name = "assigned_admin_id", nullable = false)
    private UUID assignedAdminId;

    /** Tên admin (để hiển thị cho admin khác mà không cần join) */
    @Column(name = "assigned_admin_name", length = 150, nullable = false)
    private String assignedAdminName;

    @CreationTimestamp
    @Column(name = "assigned_at", updatable = false)
    private LocalDateTime assignedAt;
}
