package com.Cinema.movie_backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "users")
public class User {

        @Id
        @GeneratedValue(strategy = GenerationType.UUID)
        @Column(name = "id", updatable = false, nullable = false)
        private UUID id;

        @Column(name = "username", length = 100, unique = true, nullable = false)
        private String username;

        @Column(name = "email", length = 150, unique = true, nullable = false)
        private String email;

        @Column(name = "password", length = 255, nullable = false)
        private String password;

        @Column(name = "phone_number", length = 15, unique = true)
        private String phoneNumber;

        @Column(name = "full_name", length = 150, nullable = false)
        private String fullName;

        @Column(name = "date_of_birth")
        private LocalDate dateOfBirth;

        @Column(name = "avatar", length = 255)
        private String avatar;

        @Column(name = "reward_points", columnDefinition = "integer default 0")
        private Integer rewardPoints = 0;

        @Column(name = "member_points")
        private Integer memberPoints = 0;

        @Column(name = "membership_tier", columnDefinition = "integer default 0")
        private Integer membershipTier = 0;

        @Column(name = "membership_tier_since")
        private LocalDateTime membershipTierSince;

        @Column(name = "member_points_earned_in_cycle")
        private Integer memberPointsEarnedInCycle = 0;

        @Column(name = "penalty_points", columnDefinition = "integer default 0")
        private Integer penaltyPoints = 0;

        @Enumerated(EnumType.STRING)
        @Column(name = "status", length = 20)
        private UserStatus status = UserStatus.UNVERIFIED; // Mặc định là UNVERIFIED, phải xác thực email mới ACTIVE

        @Column(name = "is_deleted", nullable = false)
        private Boolean isDeleted = false;

        @Column(name = "failed_attempt", columnDefinition = "integer default 0")
        private Integer failedAttempt = 0;

        @Column(name = "account_locked", nullable = false, columnDefinition = "boolean default false")
        private Boolean accountLocked = false;

        @Column(name = "spam_login_count", columnDefinition = "integer default 0")
        private Integer spamLoginCount = 0;

        @Column(name = "last_login_success_time")
        private LocalDateTime lastLoginSuccessTime;

        @Column(name = "spam_violation_level", columnDefinition = "integer default 0")
        private Integer spamViolationLevel = 0;

        @Column(name = "lock_until")
        private LocalDateTime lockUntil;

        @CreationTimestamp
        @Column(name = "created_at", updatable = false)
        private LocalDateTime createdAt;

        @UpdateTimestamp
        @Column(name = "updated_at")
        private LocalDateTime updatedAt;

        @ManyToMany(fetch = FetchType.EAGER)
        @JoinTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id", foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT)), inverseJoinColumns = @JoinColumn(name = "role_id", foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT)), indexes = {
                        @Index(name = "idx_user_roles_user_id", columnList = "user_id"),
                        @Index(name = "idx_user_roles_role_id", columnList = "role_id")
        })
        private Set<Role> roles = new HashSet<>();
}
