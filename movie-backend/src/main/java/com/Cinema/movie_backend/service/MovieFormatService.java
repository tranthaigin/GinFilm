package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.DTO.MovieFormatRequest;
import com.Cinema.movie_backend.DTO.MovieFormatResponse;
import com.Cinema.movie_backend.entity.MovieFormat;
import com.Cinema.movie_backend.repository.MovieFormatRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MovieFormatService {
    private final MovieFormatRepository movieFormatRepository;

    public List<MovieFormatResponse> getAllFormats(boolean includeDeleted) {
        List<MovieFormat> formats = includeDeleted ? 
            movieFormatRepository.findAll() : 
            movieFormatRepository.findByIsDeletedFalse();
            
        return formats.stream()
                .map(MovieFormatResponse::fromEntity)
                .collect(Collectors.toList());
    }

    public MovieFormatResponse createFormat(MovieFormatRequest request) {
        MovieFormat format = MovieFormat.builder()
                .name(request.getName())
                .supportedRoomTypes(request.getSupportedRoomTypes() != null ? request.getSupportedRoomTypes() : new java.util.HashSet<>())
                .isDeleted(false)
                .build();
        return MovieFormatResponse.fromEntity(movieFormatRepository.save(format));
    }

    public MovieFormatResponse updateFormat(Long id, MovieFormatRequest request) {
        MovieFormat format = movieFormatRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Định dạng phim không tồn tại"));
        format.setName(request.getName());
        if (request.getSupportedRoomTypes() != null) {
            format.setSupportedRoomTypes(request.getSupportedRoomTypes());
        }
        return MovieFormatResponse.fromEntity(movieFormatRepository.save(format));
    }

    public void softDeleteFormat(Long id) {
        MovieFormat format = movieFormatRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Định dạng phim không tồn tại"));
        format.setIsDeleted(true);
        movieFormatRepository.save(format);
    }

    public void restoreFormat(Long id) {
        MovieFormat format = movieFormatRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Định dạng phim không tồn tại"));
        format.setIsDeleted(false);
        movieFormatRepository.save(format);
    }
}
