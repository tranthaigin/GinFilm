package com.Cinema.movie_backend.repository;

import com.Cinema.movie_backend.entity.UserPinSecurity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserPinSecurityRepository extends JpaRepository<UserPinSecurity, UUID> {
    Optional<UserPinSecurity> findByUserId(UUID userId);
}
