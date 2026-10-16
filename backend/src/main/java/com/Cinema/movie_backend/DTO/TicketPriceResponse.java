package com.Cinema.movie_backend.DTO;

import com.Cinema.movie_backend.enums.AudienceType;
import com.Cinema.movie_backend.enums.DayType;
import com.Cinema.movie_backend.enums.RoomType;
import com.Cinema.movie_backend.enums.SeatType;
import com.Cinema.movie_backend.enums.TicketPriceStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Response trả về cho client sau khi thao tác với giá vé.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TicketPriceResponse {

    private Long id;
    private AudienceType audienceType;
    private SeatType seatType;
    private RoomType roomType;
    private DayType dayType;
    private BigDecimal price;
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
    private TicketPriceStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
