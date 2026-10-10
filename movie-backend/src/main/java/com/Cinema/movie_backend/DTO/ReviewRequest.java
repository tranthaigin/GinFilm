package com.Cinema.movie_backend.DTO;

import lombok.Data;

@Data
public class ReviewRequest {
    private Long movieId;
    private Integer rating;      // 1-5 sao
    private String content;
    private Integer watchedPercent; // % đã xem, frontend gửi lên để validate quy tắc 80%
}
