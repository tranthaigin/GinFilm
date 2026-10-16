package com.Cinema.movie_backend.repository;

import com.Cinema.movie_backend.entity.OtpToken;
import com.Cinema.movie_backend.entity.Otptype; //import thêm entity Otptype
import com.Cinema.movie_backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OtpTokenRepository extends JpaRepository<OtpToken, Integer> {

    @Query("SELECT t FROM OtpToken t WHERE t.user = :user AND t.type = :type")
    Optional<OtpToken> findByUserAndType(@Param("user") User user, @Param("type") Otptype type); //Điều chỉnh String sang Otptype

    //Điều chỉnh String sang Otptype
    @Query("SELECT t FROM OtpToken t WHERE t.user.email = :email AND t.token = :token AND t.type = :type")
    Optional<OtpToken> findByEmailAndTokenAndType(@Param("email") String email, @Param("token") String token, @Param("type") Otptype type);

    //Điều chỉnh String sang Otptype
    @Modifying
    @Query("DELETE FROM OtpToken t WHERE t.user = :user AND t.type = :type")
    void deleteByUserAndType(@Param("user") User user, @Param("type") Otptype type);
}