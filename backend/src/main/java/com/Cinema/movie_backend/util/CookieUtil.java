package com.Cinema.movie_backend.util;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
public class CookieUtil {

    @Value("${app.cookie.secure:false}")
    private boolean secureCookie;

    public ResponseCookie createAccessTokenCookie(String token, long durationSeconds) {
        String sameSite = secureCookie ? "None" : "Lax";
        return ResponseCookie.from("accessToken", token)
                .httpOnly(true)
                .secure(secureCookie)
                .path("/")
                .maxAge(durationSeconds)
                .sameSite(sameSite)
                .build();
    }

    public ResponseCookie createRefreshTokenCookie(String token, long durationSeconds) {
        String sameSite = secureCookie ? "None" : "Lax";
        return ResponseCookie.from("refreshToken", token)
                .httpOnly(true)
                .secure(secureCookie)
                .path("/")
                .maxAge(durationSeconds)
                .sameSite(sameSite)
                .build();
    }

    public ResponseCookie clearCookie(String cookieName) {
        String sameSite = secureCookie ? "None" : "Lax";
        return ResponseCookie.from(cookieName, "")
                .httpOnly(true)
                .secure(secureCookie)
                .path("/")
                .maxAge(0)
                .sameSite(sameSite)
                .build();
    }
}
