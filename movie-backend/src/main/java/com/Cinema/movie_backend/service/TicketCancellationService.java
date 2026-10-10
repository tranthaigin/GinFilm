package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.entity.Booking;
import com.Cinema.movie_backend.entity.NotificationType;
import com.Cinema.movie_backend.enums.BookingStatus;
import com.Cinema.movie_backend.repository.BookingRepository;
import com.Cinema.movie_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TicketCancellationService {

    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final MemberPointService memberPointService;

    @Transactional
    public void cancelAndRefundBookings(List<Long> affectedSeatIds) {
        if (affectedSeatIds == null || affectedSeatIds.isEmpty())
            return;

        // Lấy tất cả Booking có liên quan đến các ghế bị ảnh hưởng trong tương lai
        List<Booking> affectedBookings = bookingRepository.findFutureBookingsBySeatIds(affectedSeatIds);

        for (Booking booking : affectedBookings) {
            boolean wasCompleted = booking.getStatus() == BookingStatus.COMPLETED;

            if (wasCompleted && booking.getMemberPointsEarned() != null
                    && booking.getMemberPointsEarned() > 0 && booking.getUser() != null) {
                memberPointService.reverse(booking.getUser(), booking.getMemberPointsEarned());
                userRepository.save(booking.getUser());
                booking.setMemberPointsEarned(0);
            }

            // Hủy Booking
            booking.setStatus(BookingStatus.CANCELLED);
            bookingRepository.save(booking);

            String reason = "Ghế bạn đặt đã gặp sự cố không mong muốn (hư hỏng/bảo trì).";

            // 1. Gửi thông báo chuông (Web notification)
            notificationService.sendNotification(
                    booking.getUser(),
                    "Vé của bạn đã bị hủy",
                    "Rất tiếc, vé xem phim " + booking.getShowtime().getMovie().getTitle() + " của bạn đã bị hủy do: "
                            + reason,
                    "/user/history",
                    NotificationType.TRANSACTION);

            // 2. Gửi thông báo cho Admin
            notificationService.sendSystemNotificationToAdmins(
                    "Đã hủy vé do sự cố rạp",
                    "Hệ thống đã tự động hủy vé " + booking.getId() + " của khách hàng " + booking.getUser().getEmail()
                            + " do thay đổi sơ đồ rạp.",
                    "/admin/bookings",
                    NotificationType.SYSTEM);

            // 3. Gửi Email xin lỗi khách hàng
            sendCancellationEmail(booking.getUser().getEmail(), booking.getUser().getFullName(), booking.getShowtime().getMovie().getTitle(), reason);
        }
    }

    private void sendCancellationEmail(String toEmail, String fullName, String movieTitle, String reason) {
        String text = "Rất tiếc, hệ thống buộc phải hủy vé xem phim <b>" + movieTitle + "</b> của bạn do: <i>"
                + reason + "</i><br><br>Thành thật xin lỗi bạn vì sự cố này. Mong bạn thông cảm và tiếp tục ủng hộ rạp.";

        emailService.sendSystemEmail(toEmail, fullName, "Thông báo Hủy Vé - RapLoFilm", text);
    }
}
