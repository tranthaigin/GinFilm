package com.Cinema.movie_backend.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MovieRequest {
    private String title;
    private String description;
    private Integer duration;
    
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate releaseDate;
    
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate endDate;
    
    @DateTimeFormat(iso = DateTimeFormat.ISO.TIME)
    private java.time.LocalTime startTime;
    
    @DateTimeFormat(iso = DateTimeFormat.ISO.TIME)
    private java.time.LocalTime endTime;
    
    private String trailerUrl;
    private String ageRating;
    private String status;
    private Boolean isOnlineAvailable = false;
    private Boolean isCinemaAvailable = true;
    private String videoUrl;
    private Set<Integer> genreIds;
    private Set<Long> formatIds;
    private BigDecimal basePrice;
}
