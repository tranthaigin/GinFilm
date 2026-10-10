package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.DTO.TheaterRequest;
import com.Cinema.movie_backend.DTO.TheaterResponse;
import com.Cinema.movie_backend.entity.Province;
import com.Cinema.movie_backend.entity.Theater;
import com.Cinema.movie_backend.repository.ProvinceRepository;
import com.Cinema.movie_backend.repository.TheaterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TheaterService {

    private final TheaterRepository theaterRepository;
    private final ProvinceRepository provinceRepository;

    @Transactional
    public TheaterResponse createTheater(TheaterRequest request) {
        Province province = provinceRepository.findById(request.getProvinceId())
                .orElseThrow(
                        () -> new RuntimeException("Không tìm thấy Tỉnh/Thành phố với id: " + request.getProvinceId()));

        Theater theater = new Theater();
        theater.setName(request.getName());
        theater.setAddress(request.getAddress());
        theater.setPhone(request.getPhone());
        theater.setImage(request.getImage());
        theater.setProvince(province);
        theater.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);

        Theater saved = theaterRepository.save(theater);
        return TheaterResponse.fromEntity(saved);
    }

    @Transactional
    public TheaterResponse updateTheater(Long id, TheaterRequest request) {
        Theater theater = theaterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy rạp với id: " + id));

        Province province = provinceRepository.findById(request.getProvinceId())
                .orElseThrow(
                        () -> new RuntimeException("Không tìm thấy Tỉnh/Thành phố với id: " + request.getProvinceId()));

        theater.setName(request.getName());
        theater.setAddress(request.getAddress());
        theater.setPhone(request.getPhone());
        theater.setImage(request.getImage());
        theater.setProvince(province);
        if (request.getIsActive() != null) {
            theater.setIsActive(request.getIsActive());
        }

        Theater updated = theaterRepository.save(theater);
        return TheaterResponse.fromEntity(updated);
    }

    @Transactional
    public TheaterResponse toggleTheaterStatus(Long id) {
        Theater theater = theaterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy rạp với id: " + id));

        theater.setIsActive(!theater.getIsActive());
        Theater updated = theaterRepository.save(theater);
        return TheaterResponse.fromEntity(updated);
    }

    @Transactional(readOnly = true)
    public TheaterResponse getTheaterById(Long id) {
        Theater theater = theaterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy rạp với id: " + id));
        return TheaterResponse.fromEntity(theater);
    }

    @Transactional(readOnly = true)
    public java.util.List<TheaterResponse> getAllActiveTheaters() {
        return theaterRepository.findAllActiveTheaters().stream()
                .map(TheaterResponse::fromEntity)
                .collect(java.util.stream.Collectors.toList());
    }
}
