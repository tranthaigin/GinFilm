package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.repository.OtpTokenRepository;
import com.Cinema.movie_backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

class EmailBrandingTest {

    private static final String FRONTEND_URL = "https://cinema.example/customer";
    private static final String SUPPORT_EMAIL = "help@cinema.example";

    private BrevoEmailSender sender;
    private EmailService service;

    @BeforeEach
    void setUp() {
        sender = mock(BrevoEmailSender.class);
        service = new EmailService(sender);
        ReflectionTestUtils.setField(service, "frontendUrl", FRONTEND_URL);
        ReflectionTestUtils.setField(service, "supportEmail", SUPPORT_EMAIL);
    }

    @Test
    void cinemaTicketLinksAndQrUseTheConfiguredFrontend() {
        String html = ReflectionTestUtils.invokeMethod(service, "buildCinemaTicketHtml",
                "Thai", "GF123", "Movie", "GinFilm", "Screen 1", "2D",
                "10/10/2026", "20:00", "A1", "None", "100000");

        assertNotNull(html);
        assertTrue(html.contains("href='" + FRONTEND_URL + "/home'"));
        assertTrue(html.contains("data=" + FRONTEND_URL + "/scan/offline/GF123"));
        assertTrue(html.contains("GinFilm"));
    }

    @Test
    void contactAndNewsletterMessagesUseTheConfiguredInbox() {
        service.sendContactFormEmail("Thai", "visitor@example.com", "0123456789", "Please help");
        service.sendNewsletterNotification("subscriber@example.com");

        ArgumentCaptor<String> html = ArgumentCaptor.forClass(String.class);
        verify(sender, times(2)).sendEmail(eq(SUPPORT_EMAIL), anyString(), html.capture());
        assertTrue(html.getAllValues().stream().allMatch(value -> value.contains("GinFilm")));
    }

    @Test
    void verificationEmailUsesTheConfiguredWebsiteAndSupportAddress() {
        OtpService otpService = new OtpService(mock(OtpTokenRepository.class), mock(UserRepository.class), sender);
        ReflectionTestUtils.setField(otpService, "frontendUrl", FRONTEND_URL);
        ReflectionTestUtils.setField(otpService, "supportEmail", SUPPORT_EMAIL);

        String html = ReflectionTestUtils.invokeMethod(otpService, "buildVerificationEmailHtml", "Thai", "123456");

        assertNotNull(html);
        assertTrue(html.contains("href='" + FRONTEND_URL + "/home'"));
        assertTrue(html.contains("href='mailto:" + SUPPORT_EMAIL + "'"));
        assertTrue(html.contains("123456"));
    }
}
