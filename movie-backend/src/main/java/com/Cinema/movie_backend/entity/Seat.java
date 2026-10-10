package com.Cinema.movie_backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "seats", indexes = {
    
        @Index(name = "idx_seats_room_id", columnList = "room_id"),
        @Index(name = "idx_seats_unique_matrix", columnList = "room_id, row_symbol, seat_number", unique = true)
})
public class Seat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "room_id",
            nullable = false,
            foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT)
    )
    private Room room;

    @Column(name = "row_symbol", nullable = false, length = 5)
    private String rowSymbol; // Ký hiệu hàng ghế (A, B, C...)

    @Column(name = "seat_number", nullable = false)
    private Integer seatNumber; // Số thứ tự trong hàng 

    @Column(name = "seat_type", nullable = false, length = 20)
    private String seatType; // NORMAL, VIP, COUPLE

    @Column(name = "row_index")
    private Integer rowIndex;

    @Column(name = "column_index")
    private Integer columnIndex;

    @Builder.Default
    @Column(name = "status", nullable = false, length = 20)
    private String status = "ACTIVE"; // Tình trạng vật lý: ACTIVE, BROKEN (hỏng)
}