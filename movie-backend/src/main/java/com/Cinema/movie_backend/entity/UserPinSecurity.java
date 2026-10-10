package com.Cinema.movie_backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_pin_security", indexes = {
    @Index(name = "idx_user_pin_user_id", columnList = "user_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserPinSecurity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true, foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private User user;

    @Column(name = "pin_code", length = 255)
    private String pinCode;

    @Column(name = "failed_pin_attempts", columnDefinition = "integer default 0")
    private Integer failedPinAttempts = 0;

    @Column(name = "pin_locked_until")
    private LocalDateTime pinLockedUntil;
}
