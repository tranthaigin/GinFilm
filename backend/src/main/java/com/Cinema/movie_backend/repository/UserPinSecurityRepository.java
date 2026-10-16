package com.Cinema.movie_backend.repository;

import com.Cinema.movie_backend.entity.UserPinSecurity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserPinSecurityRepository extends JpaRepository<UserPinSecurity, UUID> {
    Optional<UserPinSecurity> findByUserId(UUID userId);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT p FROM UserPinSecurity p WHERE p.user.id = :userId")
    Optional<UserPinSecurity> findLockedByUserId(@org.springframework.data.repository.query.Param("userId") UUID userId);
}
