package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.DTO.MovieRequest;
import com.Cinema.movie_backend.entity.Genre;
import com.Cinema.movie_backend.entity.Movie;
import com.Cinema.movie_backend.entity.OnlineMoviePrice;
import com.Cinema.movie_backend.entity.MovieFormat;
import com.Cinema.movie_backend.repository.GenreRepository;
import com.Cinema.movie_backend.repository.MovieFormatRepository;
import com.Cinema.movie_backend.repository.MovieRepository;
import com.Cinema.movie_backend.repository.ShowtimeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class MovieService {

    @Autowired
    private MovieRepository movieRepository;

    @Autowired
    private GenreRepository genreRepository;
    
    @Autowired
    private MovieFormatRepository movieFormatRepository;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private ShowtimeRepository showtimeRepository;

    @Autowired
    private MovieStatusJob movieStatusJob;

    @Autowired
    private SystemConfigService systemConfigService;

    @Transactional
    public Movie createMovie(MovieRequest request, MultipartFile posterFile) {
        String posterUrl = null;
        if (posterFile != null && !posterFile.isEmpty()) {
            posterUrl = fileStorageService.storeFile(posterFile);
        }

        Set<Genre> genres = new HashSet<>();
        if (request.getGenreIds() != null && !request.getGenreIds().isEmpty()) {
            List<Genre> foundGenres = genreRepository.findAllById(request.getGenreIds());
            genres.addAll(foundGenres);
        }

        Set<MovieFormat> formats = new HashSet<>();
        if (request.getFormatIds() != null && !request.getFormatIds().isEmpty()) {
            List<MovieFormat> foundFormats = movieFormatRepository.findAllById(request.getFormatIds());
            formats.addAll(foundFormats);
        }

        Movie movie = Movie.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .duration(request.getDuration())
                .releaseDate(request.getReleaseDate())
                .endDate(request.getEndDate())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .trailerUrl(request.getTrailerUrl())
                .ageRating(request.getAgeRating())
                .status(request.getStatus())
                .isOnlineAvailable(request.getIsOnlineAvailable() != null ? request.getIsOnlineAvailable() : false)
                .isCinemaAvailable(request.getIsCinemaAvailable() != null ? request.getIsCinemaAvailable() : true)
                .videoUrl(request.getVideoUrl())
                .posterUrl(posterUrl)
                .genres(genres)
                .formats(formats)
                .build();

        if (Boolean.TRUE.equals(request.getIsOnlineAvailable()) && request.getBasePrice() != null) {
            OnlineMoviePrice onlinePrice = new OnlineMoviePrice();
            onlinePrice.setMovie(movie);
            onlinePrice.setBasePrice(request.getBasePrice());
            int buffer = systemConfigService.getDefaultVodBufferMinutes();
            onlinePrice.setValidityPeriodMinutes(movie.getDuration() != null ? movie.getDuration() + buffer : (120 + buffer));
            movie.setOnlinePrice(onlinePrice);
        }

        Movie savedMovie = movieRepository.save(movie);

        if ("upcoming".equalsIgnoreCase(savedMovie.getStatus()) || "COMING_SOON".equalsIgnoreCase(savedMovie.getStatus())) {
            movieStatusJob.notifyAllUsersAboutMovie(savedMovie, "upcoming");
        } else if ("showing".equalsIgnoreCase(savedMovie.getStatus()) || "NOW_SHOWING".equalsIgnoreCase(savedMovie.getStatus())) {
            movieStatusJob.notifyAllUsersAboutMovie(savedMovie, "showing");
        }

        return savedMovie;
    }
    
    public List<Movie> getAllMovies() {
        return movieRepository.findAll();
    }

    public List<Movie> getMoviesByGenreId(Integer genreId) {
        return movieRepository.findByGenreId(genreId);
    }

    public Movie getMovieById(Long id) {
        return movieRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phim với ID: " + id));
    }

    public List<Movie> searchMovies(String keyword) {
        return movieRepository.searchByTitleOrGenre(keyword);
    }

    @Transactional
    public Movie updateMovie(Long id, MovieRequest request, MultipartFile posterFile) {
        Movie movie = movieRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phim"));

        boolean isShowing = "showing".equalsIgnoreCase(movie.getStatus()) || "NOW_SHOWING".equalsIgnoreCase(movie.getStatus());
        
        if (isShowing) {
            if (request.getReleaseDate() != null && !request.getReleaseDate().equals(movie.getReleaseDate())) {
                throw new RuntimeException("Không thể thay đổi ngày bắt đầu khi phim đang chiếu.");
            }
            if (showtimeRepository.hasActiveShowtimes(id)) {
                if (request.getEndDate() != null && !request.getEndDate().equals(movie.getEndDate())) {
                    throw new RuntimeException("Không thể thay đổi ngày kết thúc vì phim đã có suất chiếu.");
                }
            }
        }

        if (posterFile != null && !posterFile.isEmpty()) {
            String posterUrl = fileStorageService.storeFile(posterFile);
            movie.setPosterUrl(posterUrl);
        }

        Set<Genre> genres = new HashSet<>();
        if (request.getGenreIds() != null && !request.getGenreIds().isEmpty()) {
            List<Genre> foundGenres = genreRepository.findAllById(request.getGenreIds());
            genres.addAll(foundGenres);
        }

        Set<MovieFormat> formats = new HashSet<>();
        if (request.getFormatIds() != null && !request.getFormatIds().isEmpty()) {
            List<MovieFormat> foundFormats = movieFormatRepository.findAllById(request.getFormatIds());
            formats.addAll(foundFormats);
        }

        movie.setTitle(request.getTitle());
        movie.setDescription(request.getDescription());
        movie.setDuration(request.getDuration());
        movie.setReleaseDate(request.getReleaseDate());
        movie.setEndDate(request.getEndDate());
        movie.setStartTime(request.getStartTime());
        movie.setEndTime(request.getEndTime());
        movie.setTrailerUrl(request.getTrailerUrl());
        movie.setAgeRating(request.getAgeRating());
        movie.setStatus(request.getStatus());
        movie.setIsOnlineAvailable(request.getIsOnlineAvailable() != null ? request.getIsOnlineAvailable() : false);
        movie.setIsCinemaAvailable(request.getIsCinemaAvailable() != null ? request.getIsCinemaAvailable() : true);
        movie.setVideoUrl(request.getVideoUrl());
        movie.setGenres(genres);
        movie.setFormats(formats);

        return movieRepository.save(movie);
    }

    @Transactional
    public Movie toggleMovieVisibility(Long id) {
        Movie movie = movieRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phim"));
        Boolean currentHidden = movie.getIsHidden();
        movie.setIsHidden(currentHidden != null ? !currentHidden : true);
        return movieRepository.save(movie);
    }
}
