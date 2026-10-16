package com.Cinema.movie_backend.component;

import com.Cinema.movie_backend.entity.Movie;
import com.Cinema.movie_backend.repository.MovieRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalTime;
import java.util.List;

@Component
public class DataMigrationComponent implements CommandLineRunner {

    @Autowired
    private MovieRepository movieRepository;

    @Override
    public void run(String... args) throws Exception {
        List<Movie> movies = movieRepository.findAll();
        boolean needsUpdate = false;

        for (Movie movie : movies) {
            if (movie.getEndDate() == null) {
                if (movie.getReleaseDate() != null) {
                    movie.setEndDate(movie.getReleaseDate().plusDays(30));
                }
                movie.setStartTime(LocalTime.of(0, 0));
                movie.setEndTime(LocalTime.of(23, 59));
                needsUpdate = true;
            }
        }

        if (needsUpdate) {
            movieRepository.saveAll(movies);
            System.out.println("Data migration completed: Updated old movies with default endDate, startTime, endTime.");
        }
    }
}
