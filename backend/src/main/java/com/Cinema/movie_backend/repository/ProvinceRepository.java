package com.Cinema.movie_backend.repository;

import com.Cinema.movie_backend.entity.Province;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProvinceRepository extends JpaRepository<Province, Long> {


    @Query("SELECT DISTINCT p FROM Province p JOIN p.theaters t ORDER BY p.name ASC")
    List<Province> findAllProvincesThatHaveTheaters();


    List<Province> findAllByOrderByNameAsc();

    Optional<Province> findByName(String name);
}
