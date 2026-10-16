package com.Cinema.movie_backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "tickets", indexes = {
        @Index(name = "idx_ticket_booking", columnList = "booking_id"),
        @Index(name = "idx_ticket_showtime", columnList = "showtime_id"),
        @Index(name = "idx_ticket_seat", columnList = "seat_id"),
        @Index(name = "idx_ticket_code", columnList = "ticket_code")
}, uniqueConstraints = {
        @UniqueConstraint(columnNames = {"showtime_id", "seat_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Ticket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false, foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    @org.hibernate.annotations.NotFound(action = org.hibernate.annotations.NotFoundAction.IGNORE)
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seat_id", nullable = false, foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    @org.hibernate.annotations.NotFound(action = org.hibernate.annotations.NotFoundAction.IGNORE)
    private Seat seat;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "showtime_id", nullable = false, foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    @org.hibernate.annotations.NotFound(action = org.hibernate.annotations.NotFoundAction.IGNORE)
    private Showtime showtime;

    @Column(nullable = false)
    private Double price;

    @Column(name = "ticket_code", length = 50)
    private String ticketCode;

    @Builder.Default
    @Column(name = "is_scanned", columnDefinition = "boolean default false")
    private Boolean isScanned = false;

    @Column(name = "scanned_at")
    private java.time.LocalDateTime scannedAt;
}
