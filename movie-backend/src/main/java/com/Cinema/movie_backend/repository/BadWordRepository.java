package com.Cinema.movie_backend.repository;

import com.Cinema.movie_backend.entity.BadWord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface BadWordRepository extends JpaRepository<BadWord, UUID> {

    List<BadWord> findAll();
}
