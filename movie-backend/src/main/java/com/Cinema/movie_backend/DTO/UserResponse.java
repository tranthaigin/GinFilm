package com.Cinema.movie_backend.DTO;

import com.Cinema.movie_backend.entity.Role;
import com.Cinema.movie_backend.entity.User;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

@Data 
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {

    private UUID id;
    private String username;
    private String email;
    private String phoneNumber;
    private String fullName;
    private LocalDate dateOfBirth;
    private String avatar;
    private int rewardPoints;
    private int memberPoints;
    private int membershipTier;
    private String status;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Boolean isDeleted;
    private Set<Role> roles;
    public static UserResponse fromEntity(User user) {
        if (user == null) {
            return null;
        }

        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.getFullName(),
                user.getDateOfBirth(),
                user.getAvatar(),
                user.getRewardPoints() != null ? user.getRewardPoints() : 0,
                user.getMemberPoints() != null ? user.getMemberPoints() : 0,
                user.getMembershipTier() != null ? user.getMembershipTier() : 0,
                user.getStatus() != null ? user.getStatus().name() : null,
                user.getCreatedAt(),
                user.getUpdatedAt(),
                user.getIsDeleted(),
                user.getRoles()
        );
    }
}
