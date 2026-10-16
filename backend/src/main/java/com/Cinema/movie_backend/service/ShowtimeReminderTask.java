package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.entity.Booking;
import com.Cinema.movie_backend.enums.BookingStatus;
import com.Cinema.movie_backend.repository.BookingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
@RequiredArgsConstructor
public class ShowtimeReminderTask {

    private final BookingRepository bookingRepository;
    private final EmailService emailService;
    private final NotificationService notificationService;

    // Run every 1 minute
    @Scheduled(fixedRate = 60000)
    @org.springframework.transaction.annotation.Transactional
    public void processShowtimeReminders() {
        LocalDate today = LocalDate.now();
        List<Booking> bookings = bookingRepository.findBookingsForReminders(BookingStatus.COMPLETED, today);

        LocalDateTime now = LocalDateTime.now();

        for (Booking booking : bookings) {
            LocalTime startTime = booking.getShowtime().getStartTime();
            LocalDateTime showtimeDateTime = LocalDateTime.of(today, startTime);

            long minutesUntilShowtime = ChronoUnit.MINUTES.between(now, showtimeDateTime);
            long minutesSinceShowtime = ChronoUnit.MINUTES.between(showtimeDateTime, now);

            // 1. Reminder 15 minutes before showtime
            Boolean isRemindedBefore = booking.getIsRemindedBefore();
            if ((isRemindedBefore == null || !isRemindedBefore) && minutesUntilShowtime <= 15 && minutesUntilShowtime >= 0) {
                sendBeforeReminder(booking);
                booking.setIsRemindedBefore(true);
                bookingRepository.save(booking);
            }

            // 2. Reminder 10 minutes late (after showtime started)
            // Limit to <= 60 mins to prevent sending late reminders for very old showings if the system was down
            Boolean isRemindedLate = booking.getIsRemindedLate();
            if ((isRemindedLate == null || !isRemindedLate) && minutesSinceShowtime >= 10 && minutesSinceShowtime <= 60) {
                sendLateReminder(booking);
                booking.setIsRemindedLate(true);
                bookingRepository.save(booking);
            }
        }
    }

    private void sendBeforeReminder(Booking booking) {
        String title = "Sắp tới giờ chiếu phim!";
        String message = "Phim của bạn sẽ bắt đầu trong khoảng 15 phút nữa. Hãy chuẩn bị đến rạp hoặc mở trang xem trực tuyến nhé!";
        
        // Gửi email
        emailService.sendShowtimeReminderEmail(booking, title, message);

        // Gửi thông báo chuông
        notificationService.sendNotification(
                booking.getUser(),
                title,
                message,
                "/my-tickets",
                com.Cinema.movie_backend.entity.NotificationType.SYSTEM
        );
    }

    private void sendLateReminder(Booking booking) {
        String title = "Phim đã bắt đầu chiếu!";
        String message = "Suất chiếu của bạn đã bắt đầu được 10 phút. Nếu bạn xem trực tuyến, hãy vào xem ngay để không bỏ lỡ nội dung nhé!";
        
        // Gửi email
        emailService.sendShowtimeReminderEmail(booking, title, message);

        // Gửi thông báo chuông
        notificationService.sendNotification(
                booking.getUser(),
                title,
                message,
                "/my-tickets",
                com.Cinema.movie_backend.entity.NotificationType.SYSTEM
        );
    }
}
