package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.entity.Genre;
import com.Cinema.movie_backend.entity.Movie;
import com.Cinema.movie_backend.entity.Showtime;
import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

public class ShowtimeSpecification {

    public static Specification<Showtime> buildSpecification(
            Long theaterId, Long movieId, Long roomId, String genre,
            LocalDate startDate, LocalDate endDate,
            LocalTime startTime, LocalTime endTime,
            String format, String statusTab) {

        return (root, query, criteriaBuilder) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();

            if (theaterId != null) {
                predicates.add(criteriaBuilder.equal(root.get("theater").get("id"), theaterId));
            }
            if (movieId != null) {
                predicates.add(criteriaBuilder.equal(root.get("movie").get("id"), movieId));
            }
            if (roomId != null) {
                predicates.add(criteriaBuilder.equal(root.get("room").get("id"), roomId));
            }
            if (format != null && !format.isEmpty()) {
                predicates.add(criteriaBuilder.equal(root.get("format"), format));
            }
            if (startDate != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("showDate"), startDate));
            }
            if (endDate != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("showDate"), endDate));
            }
            if (startTime != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("startTime"), startTime));
            }
            if (endTime != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("startTime"), endTime));
            }

            if (genre != null && !genre.isEmpty()) {
                Join<Showtime, Movie> movieJoin = root.join("movie", JoinType.INNER);
                Join<Movie, Genre> genreJoin = movieJoin.join("genres", JoinType.INNER);
                predicates.add(criteriaBuilder.equal(genreJoin.get("name"), genre));
            }

            if (statusTab != null && !statusTab.isEmpty()) {
                if (statusTab.equals("draft")) {
                    predicates.add(criteriaBuilder.equal(root.get("isDraft"), true));
                } else {
                    // For active/inactive, exclude drafts
                    predicates.add(criteriaBuilder.or(
                            criteriaBuilder.equal(root.get("isDraft"), false),
                            criteriaBuilder.isNull(root.get("isDraft"))
                    ));

                    if (statusTab.equals("active")) {
                        predicates.add(criteriaBuilder.equal(root.get("isHidden"), false));
                        // isPast == false => showDate > today OR (showDate == today AND startTime > now)
                        LocalDate today = LocalDate.now();
                        LocalTime now = LocalTime.now();

                        jakarta.persistence.criteria.Predicate futureDate = criteriaBuilder.greaterThan(root.get("showDate"), today);
                        jakarta.persistence.criteria.Predicate todayFutureTime = criteriaBuilder.and(
                                criteriaBuilder.equal(root.get("showDate"), today),
                                criteriaBuilder.greaterThan(root.get("startTime"), now)
                        );
                        predicates.add(criteriaBuilder.or(futureDate, todayFutureTime));
                    } else if (statusTab.equals("inactive")) {
                        // isHidden == true OR isPast == true
                        LocalDate today = LocalDate.now();
                        LocalTime now = LocalTime.now();

                        jakarta.persistence.criteria.Predicate isHidden = criteriaBuilder.equal(root.get("isHidden"), true);
                        jakarta.persistence.criteria.Predicate pastDate = criteriaBuilder.lessThan(root.get("showDate"), today);
                        jakarta.persistence.criteria.Predicate todayPastTime = criteriaBuilder.and(
                                criteriaBuilder.equal(root.get("showDate"), today),
                                criteriaBuilder.lessThanOrEqualTo(root.get("startTime"), now)
                        );
                        predicates.add(criteriaBuilder.or(isHidden, pastDate, todayPastTime));
                    }
                }
            } else {
                // By default, exclude drafts
                predicates.add(criteriaBuilder.or(
                        criteriaBuilder.equal(root.get("isDraft"), false),
                        criteriaBuilder.isNull(root.get("isDraft"))
                ));
            }

            return criteriaBuilder.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
    }
}
