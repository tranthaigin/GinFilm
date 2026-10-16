package com.Cinema.movie_backend.repository;

import com.Cinema.movie_backend.entity.Theater;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TheaterRepository extends JpaRepository<Theater, Long> {


    List<Theater> findByProvince_IdOrderByNameAsc(Long provinceId);


    @Query("""
        SELECT DISTINCT t FROM Theater t
        WHERE t.province.id = :provinceId
        ORDER BY t.name ASC
    """)
    List<Theater> findByProvinceId(@Param("provinceId") Long provinceId);

    /**
     * Lấy tất cả rạp đang hoạt động, sắp xếp theo tên.
     */
    @Query("""
        SELECT t FROM Theater t
        WHERE t.isActive = true
        ORDER BY t.name ASC
    """)
    List<Theater> findAllActiveTheaters();

    /**
     * Lấy rạp đang hoạt động theo tỉnh/thành, sắp xếp theo tên.
     */
    @Query("""
        SELECT t FROM Theater t
        WHERE t.province.id = :provinceId AND t.isActive = true
        ORDER BY t.name ASC
    """)
    List<Theater> findActiveByProvinceId(@Param("provinceId") Long provinceId);
}

