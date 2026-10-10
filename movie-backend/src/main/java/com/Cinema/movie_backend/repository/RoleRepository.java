package com.Cinema.movie_backend.repository;

import com.Cinema.movie_backend.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<Role, Integer> {

    @Query("SELECT r FROM Role r WHERE r.name = :name")
    Optional<Role> findByNameManual(@Param("name") String name);

    Optional<Object> findByName(String roleStaff);
}