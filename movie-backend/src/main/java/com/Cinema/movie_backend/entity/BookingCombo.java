package com.Cinema.movie_backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "booking_combos", indexes = {
    @Index(name = "idx_booking_combo_booking", columnList = "booking_id"),
    @Index(name = "idx_booking_combo_combo", columnList = "combo_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingCombo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false, foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "combo_id", nullable = false, foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private Combo combo;

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false)
    private Double price;

    @Builder.Default
    @Column(name = "redeemed_quantity", nullable = false, columnDefinition = "integer default 0")
    private Integer redeemedQuantity = 0;

    @Column(name = "redeemed_by_seats", columnDefinition = "text")
    private String redeemedBySeats;
}
