package com.Cinema.movie_backend.DTO;

import com.Cinema.movie_backend.enums.AudienceType;
import com.Cinema.movie_backend.enums.DayType;
import com.Cinema.movie_backend.enums.RoomType;
import com.Cinema.movie_backend.enums.SeatType;
import com.Cinema.movie_backend.enums.TicketPriceStatus;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Request body cho API tạo / cập nhật giá vé.
 */
@Data
public class TicketPriceRequest {

    private AudienceType audienceType;

    private SeatType seatType;

    private RoomType roomType;

    private DayType dayType;

    /** Giá vé (VNĐ) */
    private BigDecimal price;

    /** Null = áp dụng ngay */
    private LocalDate effectiveFrom;

    /** Null = vô thời hạn */
    private LocalDate effectiveTo;

    /** Mặc định ACTIVE nếu không truyền */
    private TicketPriceStatus status;
}
