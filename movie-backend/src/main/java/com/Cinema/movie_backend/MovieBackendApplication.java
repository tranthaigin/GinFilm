package com.Cinema.movie_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

import jakarta.annotation.PostConstruct;
import java.util.TimeZone;

@SpringBootApplication
@EnableScheduling
@EnableAsync
public class MovieBackendApplication {

    @PostConstruct
    public void init() {
        // Set JVM timezone to Vietnam to ensure LocalDateTime matches frontend local time
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
    }

   	public static void main(String[] args) {
		SpringApplication.run(MovieBackendApplication.class, args);
	}
}
