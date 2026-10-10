package com.Cinema.movie_backend.repository;

import com.Cinema.movie_backend.entity.SecurityActivityLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;
import java.util.Optional;
import java.util.List;

@Repository
public interface SecurityActivityLogRepository extends JpaRepository<SecurityActivityLog, Long> {

    Page<SecurityActivityLog> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    // Dùng để tìm xem user đã đăng nhập trên device này chưa
    Optional<SecurityActivityLog> findFirstByUserIdAndDeviceIdAndActionTypeOrderByCreatedAtDesc(
        UUID userId, String deviceId, com.Cinema.movie_backend.entity.SecurityActionType actionType);

    @org.springframework.data.jpa.repository.Query("SELECT s FROM SecurityActivityLog s JOIN s.user u JOIN u.roles r WHERE r.name = :roleName ORDER BY s.createdAt DESC")
    Page<SecurityActivityLog> findByUserRoleOrderByCreatedAtDesc(@org.springframework.data.repository.query.Param("roleName") String roleName, Pageable pageable);

    Page<SecurityActivityLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
