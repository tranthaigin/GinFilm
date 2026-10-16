package com.Cinema.movie_backend.security;

import com.Cinema.movie_backend.entity.User;
import com.Cinema.movie_backend.entity.UserStatus;
import com.Cinema.movie_backend.repository.UserRepository;
import com.Cinema.movie_backend.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.ArrayList;

@Service
@RequiredArgsConstructor
public class AuthenticationService {
    private final JwtUtil jwtUtil;
    private final UserRepository users;

    public Authentication authenticate(String token) {
        String email = jwtUtil.extractEmail(token);
        User user = users.findByEmailManual(email).orElseThrow(() -> new IllegalArgumentException("Invalid account"));
        if (user.getStatus() != UserStatus.ACTIVE || Boolean.TRUE.equals(user.getIsDeleted())
                || Boolean.TRUE.equals(user.getAccountLocked())
                || (user.getLockUntil() != null && user.getLockUntil().isAfter(LocalDateTime.now()))) {
            throw new IllegalArgumentException("Account unavailable");
        }
        var authorities = new ArrayList<SimpleGrantedAuthority>();
        for (var role : user.getRoles()) {
            String name = role.getName().replaceFirst("^ROLE_", "");
            authorities.add(new SimpleGrantedAuthority(name));
            authorities.add(new SimpleGrantedAuthority("ROLE_" + name));
        }
        return UsernamePasswordAuthenticationToken.authenticated(email, null, authorities);
    }
}
