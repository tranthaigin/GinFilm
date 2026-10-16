package com.Cinema.movie_backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.beans.factory.annotation.Value;
import java.util.Arrays;

@Configuration
@EnableWebSecurity
@org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity
public class SecurityConfig {

    @Value("${app.cors.allowed-origins:http://localhost:3000,http://localhost:5173}")
    private String corsAllowedOrigins;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Chỉ cho phép các frontend đã cấu hình khi gửi cookie xác thực.
        configuration.setAllowedOrigins(Arrays.stream(corsAllowedOrigins.split(",")).map(String::trim).filter(o -> !o.isEmpty()).toList());
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.addAllowedHeader("*");
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, com.Cinema.movie_backend.security.AuthenticationService authenticationService) throws Exception {
        http
                .cors(org.springframework.security.config.Customizer.withDefaults())
                .csrf(AbstractHttpConfigurer::disable)

                .formLogin(AbstractHttpConfigurer::disable)

                .sessionManagement(session -> session.sessionCreationPolicy(org.springframework.security.config.http.SessionCreationPolicy.STATELESS))
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint((request, response, error) -> response.sendError(401))
                        .accessDeniedHandler((request, response, error) -> response.sendError(403)))
                .addFilterBefore(new com.Cinema.movie_backend.security.JwtAuthenticationFilter(authenticationService),
                        org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(new com.Cinema.movie_backend.security.CookieOriginFilter(
                        new java.util.HashSet<>(Arrays.stream(corsAllowedOrigins.split(",")).map(String::trim).toList())),
                        org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class)
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/auth/login", "/api/auth/register", "/api/auth/verify-otp", "/api/auth/resend-otp",
                                "/api/auth/verify-account", "/api/auth/resend-verification", "/api/auth/unlock-account", "/api/auth/resend-unlock-otp",
                                "/api/auth/forgot-password", "/api/auth/reset-password", "/api/auth/refresh-token",
                                "/api/auth/refresh", "/api/auth/google", "/api/auth/google-login", "/api/auth/logout").permitAll()
                        .requestMatchers("/api/payment/vnpay-callback", "/api/payment/stripe-webhook", "/api/media/stream", "/ws/**", "/error").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET,
                                "/api/public/**", "/api/movies/**", "/api/genres/**", "/api/provinces/**", "/api/theaters/**",
                                "/api/shows/**", "/api/cinema-info/**", "/api/promotions/**", "/api/combos/**",
                                "/api/system-configs", "/api/reviews/movie/**", "/uploads/**").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/contact/send", "/api/newsletter/subscribe", "/api/chat/ai/send").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/users/pin/forgot", "/api/users/pin/reset").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/admin/combos").hasAnyAuthority("STAFF", "ADMIN")
                        .requestMatchers("/api/admin/**", "/api/reviews/admin/**", "/api/system-configs/**").hasAuthority("ADMIN")
                        .requestMatchers("/api/staff/**", "/api/scan/offline/**", "/api/tickets/scan/**").hasAnyAuthority("STAFF", "ADMIN")
                        .anyRequest().authenticated()
                );

        return http.build();
    }
}
