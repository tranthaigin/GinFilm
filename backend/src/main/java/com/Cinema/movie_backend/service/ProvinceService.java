package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.DTO.ProvinceResponse;
import com.Cinema.movie_backend.DTO.TheaterResponse;
import com.Cinema.movie_backend.entity.Province;
import com.Cinema.movie_backend.entity.Theater;
import com.Cinema.movie_backend.repository.ProvinceRepository;
import com.Cinema.movie_backend.repository.TheaterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProvinceService {

    private final ProvinceRepository provinceRepository;
    private final TheaterRepository theaterRepository;


    @Transactional(readOnly = true)
    public List<ProvinceResponse> getAllProvincesWithTheaters() {
        List<Province> provinces = provinceRepository.findAllProvincesThatHaveTheaters();
        return provinces.stream()
                .map(ProvinceResponse::fromEntity)
                .collect(Collectors.toList());
    }


    @Transactional(readOnly = true)
    public List<ProvinceResponse> getAllProvinces() {
        return provinceRepository.findAllByOrderByNameAsc().stream()
                .map(p -> ProvinceResponse.fromEntityLight(p, p.getTheaters().size()))
                .collect(Collectors.toList());
    }


    @Transactional(readOnly = true)
    public List<TheaterResponse> getTheatersByProvince(Long provinceId) {
        return theaterRepository.findByProvinceId(provinceId).stream()
                .map(TheaterResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TheaterResponse> getAllTheaters() {
        return theaterRepository.findAll().stream()
                .map(TheaterResponse::fromEntity)
                .collect(Collectors.toList());
    }
}
