package com.Cinema.movie_backend.repository;

import com.Cinema.movie_backend.entity.WatchHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface WatchHistoryRepository extends JpaRepository<WatchHistory, UUID> {
    Optional<WatchHistory> findFirstByUserIdAndMovieIdOrderByLastWatchedAtDesc(UUID userId, Long movieId);
}
