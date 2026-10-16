package com.Cinema.movie_backend.repository;

import com.Cinema.movie_backend.entity.OnlineMoviePrice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OnlineMoviePriceRepository extends JpaRepository<OnlineMoviePrice, Long> {
    Optional<OnlineMoviePrice> findByMovieId(Long movieId);
}
