package com.Cinema.movie_backend.repository;

import com.Cinema.movie_backend.entity.Promotion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface PromotionRepository extends JpaRepository<Promotion, Long> {
    List<Promotion> findByIsHiddenFalse();
    List<Promotion> findByIsHiddenFalseAndEndGreaterThanEqual(LocalDate date);
    @Query("SELECT p FROM Promotion p WHERE p.isHidden = false AND (p.end IS NULL OR p.end >= :date) ORDER BY p.id DESC")
    List<Promotion> findVisiblePromotions(@Param("date") LocalDate date);
    List<Promotion> findByTitleContainingIgnoreCaseOrCodeContainingIgnoreCase(String title, String code);
    java.util.Optional<Promotion> findByCode(String code);
}
