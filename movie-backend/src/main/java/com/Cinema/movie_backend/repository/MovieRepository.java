package com.Cinema.movie_backend.repository;

import com.Cinema.movie_backend.entity.Movie;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MovieRepository extends JpaRepository<Movie, Long> {

    @Query("SELECT DISTINCT m FROM Movie m LEFT JOIN FETCH m.genres g LEFT JOIN FETCH m.onlinePrice WHERE g.id = :genreId AND (m.isHidden = false OR m.isHidden IS NULL)")
    List<Movie> findByGenreId(@Param("genreId") Integer genreId);

    @Query("SELECT DISTINCT m FROM Movie m LEFT JOIN m.genres g WHERE (LOWER(m.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(g.name) LIKE LOWER(CONCAT('%', :keyword, '%'))) AND (m.isHidden = false OR m.isHidden IS NULL)")
    List<Movie> searchByTitleOrGenre(@Param("keyword") String keyword);


    @Query("SELECT COUNT(m) FROM Movie m WHERE m.status IN ('NOW_SHOWING', 'showing') AND (m.isHidden = false OR m.isHidden IS NULL)")
    Long countNowShowingMovies();

    @Query("SELECT m FROM Movie m LEFT JOIN FETCH m.genres WHERE m.status IN ('Đang chiếu', 'Sắp chiếu', 'NOW_SHOWING', 'COMING_SOON', 'showing', 'upcoming') AND (m.isHidden = false OR m.isHidden IS NULL)")
    List<Movie> findActiveMovies();

    @Query("SELECT m FROM Movie m LEFT JOIN FETCH m.genres LEFT JOIN FETCH m.onlinePrice WHERE m.isHidden = false OR m.isHidden IS NULL")
    List<Movie> findAllVisibleMoviesForAi();

    @Query("SELECT m.id AS id, m.title AS title, m.posterUrl AS posterUrl, " +
           "COALESCE(SUM(t.price), 0) AS revenue " +
           "FROM Ticket t JOIN t.booking b JOIN b.showtime s JOIN s.movie m " +
           "WHERE b.status = 'COMPLETED' AND (m.isHidden = false OR m.isHidden IS NULL) " +
           "GROUP BY m.id, m.title, m.posterUrl " +
           "ORDER BY COALESCE(SUM(t.price), 0) DESC")
    org.springframework.data.domain.Page<Object[]> getTopMoviesByRevenue(org.springframework.data.domain.Pageable pageable);
}
