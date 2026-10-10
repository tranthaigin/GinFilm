package com.Cinema.movie_backend.repository;

import com.Cinema.movie_backend.entity.TicketActivationHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TicketActivationHistoryRepository extends JpaRepository<TicketActivationHistory, Long> {
    List<TicketActivationHistory> findAllByOrderByActivatedAtDesc();
}
