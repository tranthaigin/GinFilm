package com.Cinema.movie_backend.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
@RequiredArgsConstructor
public class DatabaseMigrationConfig {

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void migrateDatabase() {
        try {
            jdbcTemplate.execute("ALTER TABLE reviews DROP CONSTRAINT IF EXISTS uq_review_user_movie");
            System.out.println("✅ Successfully dropped unique constraint uq_review_user_movie from reviews table.");
        } catch (Exception e) {
            System.out.println("⚠️ Could not drop constraint uq_review_user_movie. It may not exist or another error occurred: " + e.getMessage());
        }
    }
}
