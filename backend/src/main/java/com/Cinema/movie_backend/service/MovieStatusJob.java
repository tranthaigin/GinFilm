package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.entity.Movie;
import com.Cinema.movie_backend.entity.NotificationType;
import com.Cinema.movie_backend.entity.User;
import com.Cinema.movie_backend.repository.MovieRepository;
import com.Cinema.movie_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class MovieStatusJob {

    private final MovieRepository movieRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final UserRepository userRepository;

    @Scheduled(cron = "0 0 4 * * ?") // Chạy vào 4 giờ sáng mỗi ngày
    @Transactional
    public void updateMovieStatuses() {
        log.info("Bắt đầu chạy Job tự động cập nhật trạng thái phim...");
        LocalDate today = LocalDate.now();

        // 1. Kiểm tra phim Sắp chiếu -> Đang chiếu
        List<Movie> activeMovies = movieRepository.findActiveMovies();
        
        for (Movie movie : activeMovies) {
            String status = movie.getStatus();
            
            // Sắp chiếu -> Đang chiếu
            if (("upcoming".equalsIgnoreCase(status) || "COMING_SOON".equalsIgnoreCase(status)) 
                    && movie.getReleaseDate() != null 
                    && !today.isBefore(movie.getReleaseDate())) {
                
                log.info("Phim ID {} ({}) chuyển sang trạng thái Đang chiếu.", movie.getId(), movie.getTitle());
                movie.setStatus("showing");
                movieRepository.save(movie);
                
                // Gửi thông báo cho toàn bộ khách hàng
                notifyAllUsersAboutMovie(movie, "showing");
            }
            // Đang chiếu -> Kết thúc
            else if (("showing".equalsIgnoreCase(status) || "NOW_SHOWING".equalsIgnoreCase(status))
                    && movie.getEndDate() != null
                    && today.isAfter(movie.getEndDate())) {
                
                log.info("Phim ID {} ({}) chuyển sang trạng thái Kết thúc.", movie.getId(), movie.getTitle());
                movie.setStatus("ended");
                movieRepository.save(movie);
            }
        }
        log.info("Hoàn tất chạy Job tự động cập nhật trạng thái phim.");
    }

    @Async
    public void notifyAllUsersAboutMovie(Movie movie, String type) {
        List<User> customers = userRepository.findAllCustomers();
        String title;
        String message;
        String link = "/movie-details?id=" + movie.getId();
        
        if ("upcoming".equalsIgnoreCase(type)) {
            title = "Phim mới sắp chiếu: " + movie.getTitle();
            message = "Bom tấn " + movie.getTitle() + " sắp đổ bộ rạp phim. Đừng bỏ lỡ nhé!";
        } else {
            title = "Phim " + movie.getTitle() + " đã chính thức khởi chiếu!";
            message = "Phim " + movie.getTitle() + " đã chính thức có mặt tại rạp từ hôm nay. Đặt vé ngay để không bỏ lỡ những suất chiếu đầu tiên!";
        }

        for (User user : customers) {
            try {
                // Báo chuông (Không gửi Email)
                notificationService.sendNotification(user, title, message, link, NotificationType.PROMOTION);
            } catch (Exception e) {
                log.error("Lỗi khi gửi thông báo cho user {}: {}", user.getEmail(), e.getMessage());
            }
        }
    }
}
