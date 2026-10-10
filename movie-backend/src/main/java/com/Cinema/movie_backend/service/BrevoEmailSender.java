package com.Cinema.movie_backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class BrevoEmailSender {

    @Value("${brevo.api.key}")
    private String apiKey;

    @Value("${spring.mail.username}")
    private String senderEmail;

    private static final String BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

    public void sendEmail(String toEmail, String subject, String htmlContent) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("api-key", apiKey);
            headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));

            Map<String, Object> body = new HashMap<>();
            body.put("sender", Map.of("name", "RapLoFilm", "email", senderEmail));
            body.put("to", List.of(Map.of("email", toEmail)));
            body.put("subject", subject);
            body.put("htmlContent", htmlContent);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(BREVO_API_URL, entity, String.class);
            
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new RuntimeException("Brevo API trả về lỗi: " + response.getBody());
            }
        } catch (Exception e) {
            throw new RuntimeException("Gửi email qua Brevo thất bại: " + e.getMessage(), e);
        }
    }
}
