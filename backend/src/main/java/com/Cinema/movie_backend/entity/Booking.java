package com.Cinema.movie_backend.entity;

import com.Cinema.movie_backend.enums.BookingStatus;
import com.Cinema.movie_backend.enums.PaymentMethod;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "bookings", indexes = {
    @Index(name = "idx_booking_user", columnList = "user_id"),
    @Index(name = "idx_booking_showtime", columnList = "showtime_id"),
    @Index(name = "idx_booking_time", columnList = "booking_time")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    @org.hibernate.annotations.NotFound(action = org.hibernate.annotations.NotFoundAction.IGNORE)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "showtime_id", nullable = false, foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    @org.hibernate.annotations.NotFound(action = org.hibernate.annotations.NotFoundAction.IGNORE)
    private Showtime showtime;

    @Column(name = "booking_time", nullable = false)
    private LocalDateTime bookingTime;

    @Column(name = "expire_at", nullable = false)
    private LocalDateTime expireAt;

    @Column(name = "total_amount")
    private Double totalAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BookingStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method")
    private PaymentMethod paymentMethod;

    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Ticket> tickets;

    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<BookingCombo> bookingCombos;

    @OneToOne(mappedBy = "booking", cascade = CascadeType.ALL, orphanRemoval = true)
    private Payment payment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "promotion_id", foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    @org.hibernate.annotations.NotFound(action = org.hibernate.annotations.NotFoundAction.IGNORE)
    private Promotion promotion;

    @Column(name = "is_reminded_before")
    private Boolean isRemindedBefore;

    @Column(name = "is_reminded_late")
    private Boolean isRemindedLate;

    @Column(name = "points_used", columnDefinition = "integer default 0")
    private Integer pointsUsed = 0;

    @Column(name = "points_earned", columnDefinition = "integer default 0")
    private Integer pointsEarned = 0;

    @Builder.Default
    @Column(name = "member_points_earned", columnDefinition = "integer default 0")
    private Integer memberPointsEarned = 0;

    @Builder.Default
    @Column(name = "is_combo_redeemed", columnDefinition = "boolean default false")
    private Boolean isComboRedeemed = false;

    @Transient
    @com.fasterxml.jackson.annotation.JsonProperty("ticketCode")
    private String ticketCode;
}
