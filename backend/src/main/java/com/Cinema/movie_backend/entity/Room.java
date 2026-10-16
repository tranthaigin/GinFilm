package com.Cinema.movie_backend.entity;

import com.Cinema.movie_backend.enums.RoomType;
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
@Table(name = "rooms", indexes = {
        @Index(name = "idx_rooms_theater_id", columnList = "theater_id"),
        @Index(name = "idx_rooms_is_active", columnList = "is_active")
})
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "room_type", length = 20)
    private RoomType roomType;

    @Column(name = "capacity", nullable = false)
    private Integer capacity; 

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "theater_id",
            nullable = false,
            foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT)
    )
    private Theater theater;

    @Builder.Default
    @Column(name = "is_active", nullable = false, columnDefinition = "boolean default true")
    private Boolean isActive = true;

    @Column(name = "matrix_width")
    private Integer matrixWidth;

    @Column(name = "matrix_height")
    private Integer matrixHeight;

    @Builder.Default
    @Column(name = "entrance_side", length = 10)
    private String entranceSide = "LEFT";

    @Builder.Default
    @Column(name = "entrance_offset")
    private Integer entranceOffset = 0;

    @Builder.Default
    @Column(name = "exit_side", length = 10)
    private String exitSide = "RIGHT";

    @Builder.Default
    @Column(name = "exit_offset")
    private Integer exitOffset = 0;

    @Builder.Default
    @Column(name = "entrance_positions", columnDefinition = "text")
    private String entrancePositions = "LEFT:0";

    @Builder.Default
    @Column(name = "exit_positions", columnDefinition = "text")
    private String exitPositions = "RIGHT:0";
    
    @Builder.Default
    @Column(name = "max_seats_per_user", columnDefinition = "integer default 0")
    private Integer maxSeatsPerUser = 0;
}
