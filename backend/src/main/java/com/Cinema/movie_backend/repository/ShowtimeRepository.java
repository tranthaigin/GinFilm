package com.Cinema.movie_backend.repository;

import com.Cinema.movie_backend.entity.Showtime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

@Repository
public interface ShowtimeRepository extends JpaRepository<Showtime, Long>, JpaSpecificationExecutor<Showtime> {

    List<Showtime> findByShowDateBetween(LocalDate startDate, LocalDate endDate);

    @Query("SELECT s FROM Showtime s JOIN FETCH s.movie m LEFT JOIN FETCH m.genres JOIN FETCH s.room WHERE s.theater.id = :theaterId AND s.showDate = :date AND s.isHidden = false ORDER BY s.startTime ASC")
    List<Showtime> findByTheaterIdAndShowDateOrderByStartTimeAsc(Long theaterId, LocalDate date);

    @Query("SELECT s FROM Showtime s JOIN FETCH s.theater t JOIN FETCH s.room WHERE s.movie.id = :movieId AND t.province.id = :provinceId AND s.showDate = :date AND s.isHidden = false ORDER BY t.name ASC, s.startTime ASC")
    List<Showtime> findByMovieIdAndProvinceIdAndShowDateOrderByStartTimeAsc(Long movieId, Long provinceId, LocalDate date);

    boolean existsByRoomId(Long roomId);

    List<Showtime> findAllByIsHiddenFalse();

    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE Showtime s SET s.isHidden = true")
    void hideAll();

    @Query("SELECT CASE WHEN COUNT(s) > 0 THEN true ELSE false END FROM Showtime s WHERE s.movie.id = :movieId AND s.isHidden = false AND s.showDate >= CURRENT_DATE")
    boolean hasActiveShowtimes(@org.springframework.data.repository.query.Param("movieId") Long movieId);

    @org.springframework.data.jpa.repository.Modifying
    void deleteByIsDraftTrue();

    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE Showtime s SET s.isDraft = false WHERE s.isDraft = true")
    void publishDrafts();
}

