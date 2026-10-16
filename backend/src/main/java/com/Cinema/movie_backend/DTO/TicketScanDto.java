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
public class TicketScanDto {
    private String ticketCode;
    private String movieName;
    private String date;
    private String time;
    private String roomName;
    private String branchName;
    private List<String> seats;
    private String bookingStatus;
    private String customerName;
    private String customerEmail;
}
