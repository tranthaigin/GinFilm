package com.Cinema.movie_backend.DTO;

import lombok.Data;

@Data
public class TheaterRequest {
    private String name;
    private String address;
    private String phone;
    private String image;
    private Long provinceId;
    private Boolean isActive;
}
