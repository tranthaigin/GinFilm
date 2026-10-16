package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.entity.Booking;
import com.Cinema.movie_backend.enums.BookingStatus;
import com.Cinema.movie_backend.repository.BookingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class BookingCleanupTask {

    private final BookingRepository bookingRepository;
    private final com.Cinema.movie_backend.repository.UserRepository userRepository;

    // Chạy mỗi phút 1 lần (60000 ms)
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void cleanupExpiredBookings() {
        log.info("Running Booking Cleanup Task at {}", LocalDateTime.now());

        // Tìm các đơn hàng PENDING mà expireAt < Now
        List<Booking> expiredBookings = bookingRepository.findByStatusAndExpireAtBefore(
                BookingStatus.PENDING,
                LocalDateTime.now()
        );

        if (!expiredBookings.isEmpty()) {
            log.info("Found {} expired bookings. Cancelling them...", expiredBookings.size());
            for (Booking candidate : expiredBookings) {
                Booking booking = bookingRepository.findLockedById(candidate.getId()).orElseThrow();
                if (booking.getStatus() != BookingStatus.PENDING || booking.getExpireAt() == null
                        || booking.getExpireAt().isAfter(LocalDateTime.now())) continue;
                booking.setStatus(BookingStatus.CANCELLED);

                if (booking.getPointsUsed() != null && booking.getPointsUsed() > 0) {
                    com.Cinema.movie_backend.entity.User user = booking.getUser();
                    if (user != null) {
                        user.setRewardPoints((user.getRewardPoints() != null ? user.getRewardPoints() : 0) + booking.getPointsUsed());
                        userRepository.save(user);
                        booking.setPointsUsed(0);
                    }
                }

                // Hệ thống sẽ tự nhả ghế vì API hold ghế chỉ lấy PENDING và COMPLETED
                // Phải xóa các ticket cũ để tránh lỗi duplicate key value vi phạm idx_tickets_showtime_seat_unique
                if (booking.getTickets() != null) {
                    booking.getTickets().clear();
                }
            }
        }
    }
}
