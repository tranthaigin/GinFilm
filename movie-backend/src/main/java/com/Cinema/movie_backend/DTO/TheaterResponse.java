package com.Cinema.movie_backend.DTO;

import com.Cinema.movie_backend.entity.Theater;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TheaterResponse {

    private Long id;
    private String name;
    private String address;
    private String phone;
    private String image;
    private Long provinceId;
    private String provinceName;
    private Boolean isActive;

    public static TheaterResponse fromEntity(Theater theater) {
        return TheaterResponse.builder()
                .id(theater.getId())
                .name(theater.getName())
                .address(theater.getAddress())
                .phone(theater.getPhone())
                .image(theater.getImage())
                .provinceId(theater.getProvince() != null ? theater.getProvince().getId() : null)
                .provinceName(theater.getProvince() != null ? theater.getProvince().getName() : null)
                .isActive(theater.getIsActive())
                .build();
    }
}
