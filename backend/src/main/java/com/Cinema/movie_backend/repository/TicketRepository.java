package com.Cinema.movie_backend.repository;

import com.Cinema.movie_backend.entity.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long> {
    
    @Query("SELECT t.seat.id FROM Ticket t WHERE t.booking.showtime.id = :showtimeId AND (t.booking.status = 'COMPLETED' OR (t.booking.status = 'PENDING' AND t.booking.expireAt > CURRENT_TIMESTAMP))")
    List<Long> findReservedSeatIdsByShowtime(@Param("showtimeId") Long showtimeId);

    @Query("SELECT t.seat.id FROM Ticket t WHERE t.booking.showtime.id = :showtimeId AND t.booking.status = 'COMPLETED'")
    List<Long> findCompletedSeatIdsByShowtime(@Param("showtimeId") Long showtimeId);

    @Query("SELECT t.seat.id FROM Ticket t WHERE t.booking.showtime.id = :showtimeId AND t.booking.status = 'PENDING' AND t.booking.expireAt > CURRENT_TIMESTAMP")
    List<Long> findPendingSeatIdsByShowtime(@Param("showtimeId") Long showtimeId);

    List<Ticket> findByTicketCode(String ticketCode);
    List<Ticket> findByTicketCodeStartingWith(String prefix);
    List<Ticket> findByBookingId(Long bookingId);

    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.booking.status = 'COMPLETED'")
    Long countTotalTickets();

    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.booking.status = 'COMPLETED' AND t.booking.showtime.movie.id = :movieId")
    Long countTicketsByMovieId(@Param("movieId") Long movieId);

    @Query("SELECT g.name AS genreName, COUNT(t) AS ticketCount " +
           "FROM Ticket t JOIN t.booking b JOIN b.showtime s JOIN s.movie m JOIN m.genres g " +
           "WHERE b.status = 'COMPLETED' " +
           "GROUP BY g.name")
    List<Object[]> getTicketDistributionByGenre();

    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.booking.status = 'COMPLETED' AND t.booking.showtime.movie.id = :movieId AND t.booking.user.email = :email")
    int countTicketsByMovieIdAndUserEmail(@Param("movieId") Long movieId, @Param("email") String email);
}
