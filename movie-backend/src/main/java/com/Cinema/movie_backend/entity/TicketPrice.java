package com.Cinema.movie_backend.entity;

import com.Cinema.movie_backend.enums.AudienceType;
import com.Cinema.movie_backend.enums.DayType;
import com.Cinema.movie_backend.enums.RoomType;
import com.Cinema.movie_backend.enums.SeatType;
import com.Cinema.movie_backend.enums.TicketPriceStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Entity quản lý giá vé rạp chiếu phim.
 *
 * Mỗi bản ghi xác định giá cho một tổ hợp duy nhất:
 *   audience_type + seat_type + room_type + day_type
 *
 * Không dùng FK cứng tới Seat hay Room – dùng soft-reference (NO_CONSTRAINT pattern).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(
    name = "ticket_prices",
    indexes = {
        // Index 1: Unique – ngăn trùng combo 4 tiêu chí
        @Index(name = "idx_tp_unique_combo",
               columnList = "audience_type, seat_type, room_type, day_type",
               unique = true),

        // Index 2: Lookup khi đặt vé – quan trọng nhất
        @Index(name = "idx_tp_lookup",
               columnList = "seat_type, room_type, day_type, status"),

        // Index 3: Filter trạng thái
        @Index(name = "idx_tp_status", columnList = "status"),

        // Index 4-7: Tìm kiếm theo từng chiều
        @Index(name = "idx_tp_audience_type", columnList = "audience_type"),
        @Index(name = "idx_tp_seat_type",     columnList = "seat_type"),
        @Index(name = "idx_tp_room_type",     columnList = "room_type"),
        @Index(name = "idx_tp_day_type",      columnList = "day_type"),

        // Index 8-9: Lọc theo ngày hiệu lực
        @Index(name = "idx_tp_effective_from", columnList = "effective_from"),
        @Index(name = "idx_tp_effective_to",   columnList = "effective_to")
    }
)
public class TicketPrice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Đối tượng khách hàng: ADULT | STUDENT | CHILD | SENIOR */
    @Enumerated(EnumType.STRING)
    @Column(name = "audience_type", nullable = false, length = 20)
    private AudienceType audienceType;

    /** Loại ghế: NORMAL | VIP | SWEETBOX – khớp với Seat.seatType (soft reference) */
    @Enumerated(EnumType.STRING)
    @Column(name = "seat_type", nullable = false, length = 20)
    private SeatType seatType;

    /** Loại phòng chiếu: LO_RAP | LO_BED | LO_SCREEN_X – khớp với Room.roomType (soft reference) */
    @Enumerated(EnumType.STRING)
    @Column(name = "room_type", nullable = false, length = 20)
    private RoomType roomType;

    /** Loại ngày áp dụng: WEEKDAY | WEEKEND | HOLIDAY */
    @Enumerated(EnumType.STRING)
    @Column(name = "day_type", nullable = false, length = 20)
    private DayType dayType;

    /** Giá vé tính bằng đồng VNĐ – dùng BigDecimal để hỗ trợ tính toán % khuyến mãi */
    @Column(name = "price", nullable = false, precision = 12, scale = 0)
    private BigDecimal price;

    /**
     * Ngày bắt đầu hiệu lực.
     * NULL = áp dụng ngay khi tạo.
     */
    @Column(name = "effective_from")
    private LocalDate effectiveFrom;

    /**
     * Ngày kết thúc hiệu lực.
     * NULL = không giới hạn thời gian.
     */
    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    /**
     * Trạng thái giá vé – gộp cả is_hidden:
     * ACTIVE   = Đang áp dụng (hiển thị + hiệu lực)
     * INACTIVE = Không áp dụng
     * HIDDEN   = Ẩn khỏi giao diện nhưng vẫn lưu trong DB
     */
    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private TicketPriceStatus status = TicketPriceStatus.ACTIVE;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
