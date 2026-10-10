package com.Cinema.movie_backend.repository;

import com.Cinema.movie_backend.entity.MovieFormat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MovieFormatRepository extends JpaRepository<MovieFormat, Long> {
    List<MovieFormat> findByIsDeletedFalse();
}
