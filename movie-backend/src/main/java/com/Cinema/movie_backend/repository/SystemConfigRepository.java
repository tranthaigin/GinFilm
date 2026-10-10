package com.Cinema.movie_backend.repository;

import com.Cinema.movie_backend.entity.SystemConfig;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface SystemConfigRepository extends JpaRepository<SystemConfig, Long> {
    Optional<SystemConfig> findByKey(String key);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT config FROM SystemConfig config WHERE config.key IN :keys ORDER BY config.key")
    List<SystemConfig> findAllByKeyInForUpdate(@Param("keys") Collection<String> keys);
}
