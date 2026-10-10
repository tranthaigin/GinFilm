package com.Cinema.movie_backend.repository;

import com.Cinema.movie_backend.entity.Combo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ComboRepository extends JpaRepository<Combo, UUID>, JpaSpecificationExecutor<Combo> {
    List<Combo> findByIsHiddenFalse();
}
