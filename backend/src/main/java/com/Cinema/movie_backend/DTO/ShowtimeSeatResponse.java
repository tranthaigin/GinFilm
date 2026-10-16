package com.Cinema.movie_backend.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response trả về khi user vào trang chọn ghế (BookingPage).
 * Gồm thông tin suất chiếu + danh sách ghế thực tế của phòng.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShowtimeSeatResponse {

    /** Thông tin suất chiếu */
    private ShowDto show;

    /** Danh sách ghế của phòng chiếu (do admin thiết kế) */
    private List<SeatResponse> seats;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ShowDto {
        private Long id;
        private Long movieId;
        private String movieTitle;
        private String moviePosterUrl;
        private String movieTrailerUrl;
        private Long theaterId;
        private String theaterName;
        private String theaterAddress;
        private Long roomId;
        private String roomName;
        /** Định dạng ngày chiếu: yyyy-MM-dd */
        private String showDate;
        /** Giờ bắt đầu: HH:mm */
        private String startTime;
        /** Giờ kết thúc: HH:mm */
        private String endTime;
        /** Định dạng phim: "2D Phụ đề", "3D lồng tiếng"... */
        private String format;
        private Integer roomMatrixWidth;
        private Integer roomMatrixHeight;
        private String entranceSide;
        private Integer entranceOffset;
        private String exitSide;
        private Integer exitOffset;
        private List<String> entrancePositions;
        private List<String> exitPositions;
        private java.util.Map<String, java.math.BigDecimal> prices;
        private Integer maxSeatsPerUser;
    }
}
