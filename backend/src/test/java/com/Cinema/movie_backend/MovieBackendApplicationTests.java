package com.Cinema.movie_backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@SpringBootTest(properties = {
        "brevo.api.key=", "stripe.api.key=", "stripe.webhook.secret=", "vnpay.hashSecret=", "gemini.api.key=",
        "spring.mail.username=review@example.invalid", "spring.mail.password=", "google.client-id=",
        "app.s3.access-key-id=", "app.s3.secret-access-key=", "spring.jpa.show-sql=false"
})
@EnabledIfEnvironmentVariable(named = "GINFILM_TEST_DATABASE_URL", matches = "jdbc:postgresql:.*[/]ginfilm_(test|review)_.*")
class MovieBackendApplicationTests {

    @DynamicPropertySource
    static void testDatabase(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> System.getenv("GINFILM_TEST_DATABASE_URL"));
        registry.add("spring.datasource.username", () -> System.getenv("GINFILM_TEST_DATABASE_USER"));
        registry.add("spring.datasource.password", () -> System.getenv("GINFILM_TEST_DATABASE_PASSWORD"));
    }

	@Test
	void contextLoads() {
	}

}
