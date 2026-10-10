package com.Cinema.movie_backend.repository;

import com.Cinema.movie_backend.entity.BookingCombo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Repository
public interface BookingComboRepository extends JpaRepository<BookingCombo, Long> {
    
    @Query("SELECT bc.combo.id as comboId, SUM(bc.quantity) as totalSold, SUM(bc.quantity * bc.price) as totalRevenue " +
           "FROM BookingCombo bc " +
           "WHERE bc.booking.status = com.Cinema.movie_backend.enums.BookingStatus.COMPLETED " +
           "GROUP BY bc.combo.id")
    List<Object[]> getComboRevenueStats();
    
    @Query("SELECT CAST(bc.booking.bookingTime AS date) as bookingDate, bc.combo.name as comboName, SUM(bc.quantity) as sold, SUM(bc.quantity * bc.price) as revenue " +
           "FROM BookingCombo bc " +
           "WHERE bc.booking.status = com.Cinema.movie_backend.enums.BookingStatus.COMPLETED " +
           "AND bc.booking.bookingTime >= :startDate AND bc.booking.bookingTime <= :endDate " +
           "GROUP BY CAST(bc.booking.bookingTime AS date), bc.combo.name " +
           "ORDER BY CAST(bc.booking.bookingTime AS date) ASC")
    List<Object[]> getComboChartData(LocalDateTime startDate, LocalDateTime endDate);
}
