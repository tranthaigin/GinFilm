package com.Cinema.movie_backend.repository;

import com.Cinema.movie_backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    // JPQL tìm theo Username
    @Query("SELECT u FROM User u WHERE u.username = :username")
    java.util.List<User> findByUsernameManualList(@Param("username") String username);
    
    default Optional<User> findByUsernameManual(String username) {
        return findByUsernameManualList(username).stream().findFirst();
    }

    // Native SQL tìm theo Email
    @Query(value = "SELECT * FROM users WHERE email = :email LIMIT 1", nativeQuery = true)
    Optional<User> findByEmailManual(@Param("email") String email);

    // Native SQL tìm theo Số điện thoại
    @Query(value = "SELECT * FROM users WHERE phone_number = :phone LIMIT 1", nativeQuery = true)
    Optional<User> findByPhoneManual(@Param("phone") String phone);

    // Tìm tất cả khách hàng (ROLE_USER) và chưa bị xoá mềm, chưa bị khoá
    @Query("SELECT u FROM User u JOIN u.roles r WHERE r.name = 'ROLE_USER' AND u.isDeleted = false AND u.status != 'LOCKED' AND NOT EXISTS (SELECT 1 FROM u.roles r2 WHERE r2.name IN ('ROLE_ADMIN', 'ROLE_STAFF'))")
    java.util.List<User> findAllCustomers();

    // Tìm tất cả nhân viên (ROLE_STAFF) và chưa bị xoá mềm, chưa bị khoá
    @Query("SELECT u FROM User u JOIN u.roles r WHERE r.name = 'ROLE_STAFF' AND u.isDeleted = false AND u.status != 'LOCKED' AND NOT EXISTS (SELECT 1 FROM u.roles r2 WHERE r2.name = 'ROLE_ADMIN')")
    java.util.List<User> findAllStaff();

    // Tìm tất cả nhân viên đã bị xoá mềm hoặc bị khoá (ROLE_STAFF)
    @Query("SELECT u FROM User u JOIN u.roles r WHERE r.name = 'ROLE_STAFF' AND (u.isDeleted = true OR u.status = 'LOCKED') AND NOT EXISTS (SELECT 1 FROM u.roles r2 WHERE r2.name = 'ROLE_ADMIN')")
    java.util.List<User> findAllDeletedStaff();

    // Tìm tất cả khách hàng đã bị xoá mềm hoặc bị khoá (ROLE_USER)
    @Query("SELECT u FROM User u JOIN u.roles r WHERE r.name = 'ROLE_USER' AND (u.isDeleted = true OR u.status = 'LOCKED') AND NOT EXISTS (SELECT 1 FROM u.roles r2 WHERE r2.name IN ('ROLE_ADMIN', 'ROLE_STAFF'))")
    java.util.List<User> findAllDeletedCustomers();

    boolean existsByEmail(String email);

    boolean existsByUsername(String username);

    @Query("SELECT COUNT(u) FROM User u JOIN u.roles r WHERE r.name = 'ROLE_USER' AND u.isDeleted = false AND NOT EXISTS (SELECT 1 FROM u.roles r2 WHERE r2.name IN ('ROLE_ADMIN', 'ROLE_STAFF'))")
    Long countTotalCustomers();

    @Query("SELECT u FROM User u JOIN u.roles r WHERE r.name = 'ROLE_ADMIN' AND u.isDeleted = false")
    java.util.List<User> findAllAdmins();
}