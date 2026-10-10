package com.Cinema.movie_backend.repository;

import com.Cinema.movie_backend.entity.Booking;
import com.Cinema.movie_backend.enums.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByStatusAndExpireAtBefore(BookingStatus status, LocalDateTime now);
    List<Booking> findByShowtimeId(Long showtimeId);
    List<Booking> findByUserEmailOrderByBookingTimeDesc(String email);

    @org.springframework.data.jpa.repository.Query("SELECT COALESCE(SUM(t.price), 0) FROM Ticket t WHERE t.booking.status = 'COMPLETED'")
    Double getTotalRevenue();

    List<Booking> findByStatusAndBookingTimeAfter(BookingStatus status, LocalDateTime time);



    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT b FROM Booking b JOIN b.tickets t WHERE t.seat.id IN :seatIds AND (b.showtime.showDate > CURRENT_DATE OR (b.showtime.showDate = CURRENT_DATE AND b.showtime.startTime > CURRENT_TIME)) AND b.status != com.Cinema.movie_backend.enums.BookingStatus.CANCELLED")
    List<Booking> findFutureBookingsBySeatIds(@org.springframework.data.repository.query.Param("seatIds") List<Long> seatIds);

    @org.springframework.data.jpa.repository.Query("SELECT b FROM Booking b WHERE b.status = :status AND b.showtime.showDate = :date AND (b.isRemindedBefore IS NULL OR b.isRemindedBefore = false OR b.isRemindedLate IS NULL OR b.isRemindedLate = false)")
    List<Booking> findBookingsForReminders(@org.springframework.data.repository.query.Param("status") BookingStatus status, @org.springframework.data.repository.query.Param("date") java.time.LocalDate date);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(b) FROM Booking b WHERE b.promotion.id = :promotionId AND b.user.id = :userId AND b.status != :status")
    int countByPromotionIdAndUserIdAndStatusNot(@org.springframework.data.repository.query.Param("promotionId") Long promotionId, @org.springframework.data.repository.query.Param("userId") java.util.UUID userId, @org.springframework.data.repository.query.Param("status") BookingStatus status);

    @org.springframework.data.jpa.repository.Query("""
            SELECT b.user.id, b.user.fullName, b.user.avatar, b.user.memberPoints, b.user.membershipTier,
                   COALESCE(SUM(b.totalAmount), 0), COUNT(b.id)
            FROM Booking b
            WHERE b.status = com.Cinema.movie_backend.enums.BookingStatus.COMPLETED
              AND b.bookingTime >= :start
              AND b.bookingTime < :end
              AND (b.user.isDeleted = false OR b.user.isDeleted IS NULL)
            GROUP BY b.user.id, b.user.fullName, b.user.avatar, b.user.memberPoints, b.user.membershipTier
            """)
    List<Object[]> getLeaderboardTotals(
            @org.springframework.data.repository.query.Param("start") LocalDateTime start,
            @org.springframework.data.repository.query.Param("end") LocalDateTime end);
}
