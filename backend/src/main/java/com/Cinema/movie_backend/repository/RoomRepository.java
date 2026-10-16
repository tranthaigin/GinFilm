package com.Cinema.movie_backend.repository;

import com.Cinema.movie_backend.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {
    List<Room> findByTheaterId(Long theaterId);
    List<Room> findByTheaterIdAndIsActiveTrue(Long theaterId);
}