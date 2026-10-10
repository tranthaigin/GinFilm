package com.Cinema.movie_backend.repository;

import com.Cinema.movie_backend.entity.OnlineTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;

@Repository
public interface OnlineTicketRepository extends JpaRepository<OnlineTicket, Long> {
    List<OnlineTicket> findByUserEmailOrderByPurchaseTimeDesc(String email);

    List<OnlineTicket> findByMovieId(Long movieId);

    List<OnlineTicket> findByActivatedAtIsNull();

    @org.springframework.data.jpa.repository.Query("SELECT t FROM OnlineTicket t WHERE t.currentViewer.email = :viewerEmail AND t.user.email != :viewerEmail ORDER BY t.activatedAt DESC")
    List<OnlineTicket> findSharedTickets(@org.springframework.data.repository.query.Param("viewerEmail") String viewerEmail);

    Optional<OnlineTicket> findByTicketCode(String ticketCode);

    List<OnlineTicket> findByUserIdAndMovieId(java.util.UUID userId, Long movieId);

    boolean existsByMovieIdAndUserEmail(Long movieId, String email);

    @org.springframework.data.jpa.repository.Query("SELECT t FROM OnlineTicket t WHERE t.lastWatchedAt <= :timeThreshold AND (t.isReviewReminded IS NULL OR t.isReviewReminded = false) AND t.activatedAt IS NOT NULL")
    List<OnlineTicket> findTicketsToRemind(@org.springframework.data.repository.query.Param("timeThreshold") java.time.LocalDateTime timeThreshold);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(o) FROM OnlineTicket o WHERE o.movie.id = :movieId AND o.user.email = :email")
    int countByMovieIdAndUserEmail(@org.springframework.data.repository.query.Param("movieId") Long movieId, @org.springframework.data.repository.query.Param("email") String email);

    @org.springframework.data.jpa.repository.Query("SELECT SUM(ot.price) FROM OnlineTicket ot")
    Double getTotalRevenue();

    @org.springframework.data.jpa.repository.Query("SELECT CAST(ot.purchaseTime AS date) as purchaseDate, SUM(ot.price) as revenue, COUNT(ot) as totalSold FROM OnlineTicket ot GROUP BY CAST(ot.purchaseTime AS date) ORDER BY purchaseDate ASC")
    List<Object[]> getDailyRevenueStats();

    @org.springframework.data.jpa.repository.Query("SELECT ot.movie.title as movieTitle, SUM(ot.price) as revenue, COUNT(ot) as totalSold FROM OnlineTicket ot GROUP BY ot.movie.title ORDER BY revenue DESC")
    List<Object[]> getRevenueByMovieStats();

    @org.springframework.data.jpa.repository.Query("""
            SELECT ot.user.id, ot.user.fullName, ot.user.avatar, ot.user.memberPoints, ot.user.membershipTier,
                   COALESCE(SUM(ot.price), 0), COUNT(ot.id)
            FROM OnlineTicket ot
            WHERE ot.purchaseTime >= :start
              AND ot.purchaseTime < :end
              AND (ot.user.isDeleted = false OR ot.user.isDeleted IS NULL)
            GROUP BY ot.user.id, ot.user.fullName, ot.user.avatar, ot.user.memberPoints, ot.user.membershipTier
            """)
    List<Object[]> getLeaderboardTotals(
            @org.springframework.data.repository.query.Param("start") LocalDateTime start,
            @org.springframework.data.repository.query.Param("end") LocalDateTime end);
}
