package com.Cinema.movie_backend.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MyTicketDto {
    private String id;
    private Long movieId;
    private String movie;
    private String date;
    private String time;
    private String cinema;
    private Double total;
    private String type; // "web" | "cinema"
    private String poster;
    private List<String> seats;
    private String combo;
    private Boolean isActivated;
    private String ownerEmail;
    private String bookingCode;
    private java.time.LocalDateTime bookingTime;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TicketDetail {
        private String seatName;
        private String ticketCode;
        private Boolean isScanned;
    }

    private List<TicketDetail> ticketDetails;
}
