package com.Cinema.movie_backend.security;

import com.Cinema.movie_backend.config.SecurityConfig;
import com.Cinema.movie_backend.entity.*;
import com.Cinema.movie_backend.entity.Role;
import com.Cinema.movie_backend.repository.UserRepository;
import com.Cinema.movie_backend.util.JwtUtil;
import org.junit.jupiter.api.*;
import org.springframework.context.annotation.*;
import org.springframework.mock.web.MockServletContext;
import org.springframework.security.web.FilterChainProxy;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ApiSecurityTest {
    @Configuration @EnableWebMvc @Import(SecurityConfig.class)
    static class Config {
        @Bean UserRepository users() { return mock(UserRepository.class); }
        @Bean JwtUtil jwt() {
            JwtUtil jwt = new JwtUtil();
            ReflectionTestUtils.setField(jwt, "secretKey", Base64.getEncoder().encodeToString(new byte[32]));
            ReflectionTestUtils.setField(jwt, "jwtExpiration", 60000L);
            return jwt;
        }
        @Bean AuthenticationService authentication(JwtUtil jwt, UserRepository users) { return new AuthenticationService(jwt, users); }
        @Bean Routes routes() { return new Routes(); }
    }
    @RestController static class Routes {
        @GetMapping({"/api/admin/customers", "/api/staff/pos/showtimes", "/api/public/health", "/api/auth/me"}) String get() { return "ok"; }
        @PutMapping("/api/system-configs/test")
        @org.springframework.security.access.prepost.PreAuthorize("hasAuthority('ADMIN')")
        String put() { return "ok"; }
        @GetMapping("/api/bookings/legacy-cookie")
        String cookie(@CookieValue("accessToken") String token) { return token; }
    }
    AnnotationConfigWebApplicationContext context;
    MockMvc mvc;
    @BeforeEach void setup() {
        context = new AnnotationConfigWebApplicationContext();
        context.getEnvironment().getPropertySources().addFirst(new org.springframework.core.env.MapPropertySource("test", Map.of(
                "jwt.secret", Base64.getEncoder().encodeToString(new byte[32]), "jwt.expiration", "60000")));
        context.setServletContext(new MockServletContext());
        context.register(Config.class); context.refresh();
        mvc = MockMvcBuilders.webAppContextSetup(context).addFilters(context.getBean(FilterChainProxy.class)).build();
    }
    @AfterEach void close() { context.close(); }
    @Test void bearerCredentialReachesCookieBasedControllers() throws Exception {
        String verified = token("ROLE_USER");
        mvc.perform(get("/api/bookings/legacy-cookie").header("Authorization", "Bearer " + verified))
                .andExpect(status().isOk()).andExpect(content().string(verified));
    }
    @Test void verifiedBearerTakesPrecedenceOverStaleCookie() throws Exception {
        String verified = token("ROLE_USER");
        mvc.perform(get("/api/bookings/legacy-cookie").header("Authorization", "Bearer " + verified)
                .cookie(new jakarta.servlet.http.Cookie("accessToken", "stale-token")))
                .andExpect(status().isOk()).andExpect(content().string(verified));
    }
    @Test void invalidBearerCannotFallBackToValidCookie() throws Exception {
        mvc.perform(get("/api/bookings/legacy-cookie").header("Authorization", "Bearer invalid")
                .cookie(new jakarta.servlet.http.Cookie("accessToken", token("ROLE_USER"))))
                .andExpect(status().isUnauthorized());
    }
    String token(String roleName) {
        User user = new User(); user.setEmail("test@example.com"); user.setStatus(UserStatus.ACTIVE);
        Role role = new Role(); role.setName(roleName); user.setRoles(Set.of(role));
        when(context.getBean(UserRepository.class).findByEmailManual(user.getEmail())).thenReturn(Optional.of(user));
        return context.getBean(JwtUtil.class).generateToken(user);
    }
    @Test void anonymousAdminDenied() throws Exception { mvc.perform(get("/api/admin/customers")).andExpect(status().isUnauthorized()); }
    @Test void customerAdminDenied() throws Exception { mvc.perform(get("/api/admin/customers").header("Authorization", "Bearer " + token("USER"))).andExpect(status().isForbidden()); }
    @Test void adminAllowed() throws Exception { mvc.perform(get("/api/admin/customers").header("Authorization", "Bearer " + token("ADMIN"))).andExpect(status().isOk()); }
    @Test void staffPosAllowedButAdminDenied() throws Exception {
        String token = token("STAFF");
        mvc.perform(get("/api/staff/pos/showtimes").header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        mvc.perform(get("/api/admin/customers").header("Authorization", "Bearer " + token)).andExpect(status().isForbidden());
    }
    @Test void publicReadAllowed() throws Exception { mvc.perform(get("/api/public/health")).andExpect(status().isOk()); }
    @Test void authProfileRequiresLogin() throws Exception { mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized()); }
    @Test void tamperedTokenDenied() throws Exception { mvc.perform(get("/api/admin/customers").header("Authorization", "Bearer " + token("ADMIN") + "bad")).andExpect(status().isUnauthorized()); }
    @Test void deletedAccountDenied() throws Exception {
        String jwt = token("ADMIN");
        context.getBean(UserRepository.class).findByEmailManual("test@example.com").orElseThrow().setIsDeleted(true);
        mvc.perform(get("/api/admin/customers").header("Authorization", "Bearer " + jwt)).andExpect(status().isUnauthorized());
    }
    @Test void untrustedCorsRejected() throws Exception { mvc.perform(get("/api/public/health").header("Origin", "https://evil.example")).andExpect(status().isForbidden()); }
    @Test void trustedCorsAccepted() throws Exception { mvc.perform(get("/api/public/health").header("Origin", "http://localhost:5173")).andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173")); }
    @Test void crossSiteCookieMutationDenied() throws Exception {
        mvc.perform(put("/api/system-configs/test").cookie(new jakarta.servlet.http.Cookie("accessToken", token("ADMIN")))
                .header("Origin", "https://evil.example")).andExpect(status().isForbidden());
    }
    @Test void sameOriginAdminMutationAllowed() throws Exception {
        mvc.perform(put("/api/system-configs/test").cookie(new jakarta.servlet.http.Cookie("accessToken", token("ADMIN")))
                .header("Origin", "http://localhost:5173")).andExpect(status().isOk());
    }
    @Test void fakePaymentCallbackNoLongerPublic() throws Exception { mvc.perform(get("/api/payment/mock-callback")).andExpect(status().isUnauthorized()); }
}
