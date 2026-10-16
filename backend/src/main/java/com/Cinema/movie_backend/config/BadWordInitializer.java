package com.Cinema.movie_backend.config;

import com.Cinema.movie_backend.repository.BadWordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class BadWordInitializer implements CommandLineRunner {

    private final BadWordRepository badWordRepository;

    @Override
    public void run(String... args) {
        // Đã xóa khởi tạo dữ liệu mẫu theo yêu cầu
    }
}
