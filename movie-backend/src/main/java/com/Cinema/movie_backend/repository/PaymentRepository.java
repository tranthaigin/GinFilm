package com.Cinema.movie_backend.repository;

import com.Cinema.movie_backend.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByTransactionNo(String transactionNo);
    Optional<Payment> findByBooking(com.Cinema.movie_backend.entity.Booking booking);
}
