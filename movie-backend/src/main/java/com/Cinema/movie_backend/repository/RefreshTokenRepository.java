package com.Cinema.movie_backend.repository;

import com.Cinema.movie_backend.entity.RefreshToken;
import com.Cinema.movie_backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    /**
     * Tim refresh token theo gia tri token string.
     */
    @Query("SELECT rt FROM RefreshToken rt WHERE rt.token = :token")
    Optional<RefreshToken> findByToken(@Param("token") String token);

    /**
     * Xoa tat ca refresh token cua mot user (dung khi logout tat ca thiet bi).
     */
    @Modifying
    @Query("DELETE FROM RefreshToken rt WHERE rt.user = :user")
    void deleteAllByUser(@Param("user") User user);

    /**
     * Dem so luong refresh token hop le (chua bi revoke, chua het han) cua mot user.
     */
    @Query("SELECT COUNT(rt) FROM RefreshToken rt WHERE rt.user = :user AND rt.isRevoked = false")
    long countActiveByUser(@Param("user") User user);
}
