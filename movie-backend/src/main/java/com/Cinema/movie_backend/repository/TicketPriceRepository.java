package com.Cinema.movie_backend.repository;

import com.Cinema.movie_backend.entity.TicketPrice;
import com.Cinema.movie_backend.enums.AudienceType;
import com.Cinema.movie_backend.enums.DayType;
import com.Cinema.movie_backend.enums.RoomType;
import com.Cinema.movie_backend.enums.SeatType;
import com.Cinema.movie_backend.enums.TicketPriceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TicketPriceRepository extends JpaRepository<TicketPrice, Long> {

    /**
     * Kiểm tra trùng combo 4 tiêu chí (dùng khi tạo mới).
     */
    boolean existsByAudienceTypeAndSeatTypeAndRoomTypeAndDayType(
            AudienceType audienceType,
            SeatType seatType,
            RoomType roomType,
            DayType dayType
    );

    /**
     * Kiểm tra trùng combo khi cập nhật (loại trừ bản ghi hiện tại).
     */
    boolean existsByAudienceTypeAndSeatTypeAndRoomTypeAndDayTypeAndIdNot(
            AudienceType audienceType,
            SeatType seatType,
            RoomType roomType,
            DayType dayType,
            Long excludeId
    );

    /**
     * Lấy tất cả giá vé theo trạng thái.
     */
    List<TicketPrice> findByStatus(TicketPriceStatus status);

    /**
     * Lấy tất cả giá vé theo trạng thái, sắp xếp mặc định.
     */
    List<TicketPrice> findByStatusOrderByAudienceTypeAscSeatTypeAscRoomTypeAscDayTypeAsc(TicketPriceStatus status);

    /**
     * Lấy toàn bộ danh sách (admin quản lý).
     */
    List<TicketPrice> findAllByOrderByAudienceTypeAscSeatTypeAscRoomTypeAscDayTypeAsc();

    /**
     * Tra cứu giá khi đặt vé – sử dụng idx_tp_lookup.
     * Ưu tiên: effective_from <= today AND (effective_to IS NULL OR effective_to >= today)
     */
    @Query("""
        SELECT tp FROM TicketPrice tp
        WHERE tp.seatType    = :seatType
          AND tp.roomType    = :roomType
          AND tp.dayType     = :dayType
          AND tp.audienceType = :audienceType
          AND tp.status      = 'ACTIVE'
          AND (tp.effectiveFrom IS NULL OR tp.effectiveFrom <= :today)
          AND (tp.effectiveTo   IS NULL OR tp.effectiveTo   >= :today)
        ORDER BY tp.effectiveFrom DESC
    """)
    Optional<TicketPrice> findActivePrice(
            @Param("audienceType") AudienceType audienceType,
            @Param("seatType")    SeatType seatType,
            @Param("roomType")    RoomType roomType,
            @Param("dayType")     DayType dayType,
            @Param("today")       LocalDate today
    );
}
