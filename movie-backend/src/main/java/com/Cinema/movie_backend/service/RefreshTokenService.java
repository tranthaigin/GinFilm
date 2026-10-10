package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.entity.RefreshToken;
import com.Cinema.movie_backend.entity.User;
import com.Cinema.movie_backend.repository.RefreshTokenRepository;
import com.Cinema.movie_backend.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtUtil jwtUtil;

    /**
     * Thoi gian song cua refresh token tinh bang milliseconds (mac dinh 7 ngay).
     */
    @Value("${jwt.refresh-expiration:604800000}")
    private long refreshExpiration;

    /**
     * Tao moi mot refresh token cho user va luu vao DB.
     * @param user Nguoi dung can cap refresh token
     * @return RefreshToken entity da duoc luu
     */
    @Transactional
    public RefreshToken createRefreshToken(User user) {
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setToken(UUID.randomUUID().toString());
        refreshToken.setUser(user);
        refreshToken.setExpiryTime(LocalDateTime.now().plusSeconds(refreshExpiration / 1000));
        refreshToken.setIsRevoked(false);
        return refreshTokenRepository.save(refreshToken);
    }

    /**
     * Kiem tra refresh token hop le, sau do cap access token moi.
     * Neu token khong hop le / het han / da bi revoke -> nem RuntimeException.
     *
     * @param tokenStr Gia tri refresh token tu client gui len
     * @return Access token moi duoc ky bang JwtUtil
     */
    @Transactional
    public String verifyAndGenerateAccessToken(String tokenStr) {
        RefreshToken refreshToken = refreshTokenRepository.findByToken(tokenStr)
                .orElseThrow(() -> new RuntimeException("Refresh token khong hop le"));

        if (Boolean.TRUE.equals(refreshToken.getIsRevoked())) {
            throw new RuntimeException("Refresh token da bi thu hoi. Vui long dang nhap lai.");
        }

        if (refreshToken.getExpiryTime().isBefore(LocalDateTime.now())) {
            // Tu dong xoa token het han khoi DB
            refreshTokenRepository.delete(refreshToken);
            throw new RuntimeException("Refresh token da het han. Vui long dang nhap lai.");
        }

        User user = refreshToken.getUser();
        return jwtUtil.generateToken(user);
    }

    /**
     * Thu hoi (revoke) mot refresh token cu the (dung khi logout tren 1 thiet bi).
     * @param tokenStr Gia tri token can thu hoi
     */
    @Transactional
    public void revokeToken(String tokenStr) {
        refreshTokenRepository.findByToken(tokenStr).ifPresent(rt -> {
            rt.setIsRevoked(true);
            refreshTokenRepository.save(rt);
        });
    }

    /**
     * Xoa tat ca refresh token cua user (dung khi logout toan bo thiet bi / doi mat khau).
     * @param user Nguoi dung can thu hoi toan bo token
     */
    @Transactional
    public void revokeAllByUser(User user) {
        refreshTokenRepository.deleteAllByUser(user);
    }
}
