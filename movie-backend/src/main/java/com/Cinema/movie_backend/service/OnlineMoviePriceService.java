package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.DTO.OnlineMoviePriceRequest;
import com.Cinema.movie_backend.DTO.OnlineMoviePriceResponse;
import com.Cinema.movie_backend.entity.Movie;
import com.Cinema.movie_backend.entity.OnlineMoviePrice;

import com.Cinema.movie_backend.entity.OnlineTicket;
import com.Cinema.movie_backend.repository.MovieRepository;
import com.Cinema.movie_backend.repository.OnlineMoviePriceRepository;
import com.Cinema.movie_backend.repository.OnlineTicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OnlineMoviePriceService {
    private final OnlineMoviePriceRepository priceRepository;
    private final MovieRepository movieRepository;
    private final OnlineTicketRepository onlineTicketRepository;
    private final SystemConfigService systemConfigService;

    @Transactional(readOnly = true)
    public List<OnlineMoviePriceResponse> getAllOnlinePrices() {
        return priceRepository.findAll().stream()
                .map(OnlineMoviePriceResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public OnlineMoviePriceResponse getPriceByMovieId(Long movieId) {
        OnlineMoviePrice price = priceRepository.findByMovieId(movieId)
                .orElseThrow(() -> new RuntimeException("No online price found for movie ID " + movieId));
        return OnlineMoviePriceResponse.fromEntity(price);
    }

    @Transactional
    public OnlineMoviePriceResponse updatePrice(Long movieId, OnlineMoviePriceRequest request) {
        Movie movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new RuntimeException("Phim không tồn tại với ID " + movieId));
                
        if (movie.getIsOnlineAvailable() == null || !movie.getIsOnlineAvailable()) {
            throw new IllegalArgumentException("Movie is not available online");
        }

        OnlineMoviePrice price = priceRepository.findByMovieId(movieId).orElseGet(() -> {
            OnlineMoviePrice newPrice = new OnlineMoviePrice();
            newPrice.setMovie(movie);
            return newPrice;
        });

        price.setBasePrice(request.getBasePrice());
        price.setDiscountPercentage(request.getDiscountPercentage() != null ? request.getDiscountPercentage() : 0);
        price.setPromoStartDate(request.getPromoStartDate());
        price.setPromoEndDate(request.getPromoEndDate());

        if (request.getValidityPeriodMinutes() != null) {
            price.setValidityPeriodMinutes(request.getValidityPeriodMinutes());
            
            // Đồng bộ thời lượng vé tồn tại CHỈ CHO CÁC VÉ CHƯA KÍCH HOẠT (activatedAt == null)
            List<OnlineTicket> tickets = onlineTicketRepository.findByMovieId(movieId);
            for (OnlineTicket ticket : tickets) {
                if (ticket.getActivatedAt() == null) {
                    ticket.setTimeLimitMinutes(request.getValidityPeriodMinutes());
                    onlineTicketRepository.save(ticket);
                }
            }
        } else if (price.getId() == null) {
            int buffer = systemConfigService.getDefaultVodBufferMinutes();
            price.setValidityPeriodMinutes(movie.getDuration() != null ? movie.getDuration() + buffer : (120 + buffer));
        }

        priceRepository.save(price);
        return OnlineMoviePriceResponse.fromEntity(price);
    }
}
