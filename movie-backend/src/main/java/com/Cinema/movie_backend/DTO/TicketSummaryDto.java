package com.Cinema.movie_backend.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TicketSummaryDto {
    private String ticketCode;
    private String seatName;
    private Boolean isScanned;
    private String scannedAt;
}
