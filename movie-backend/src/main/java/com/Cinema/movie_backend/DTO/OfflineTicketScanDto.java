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
public class OfflineTicketScanDto {
    private String ticketCode;
    private String movieName;
    private String moviePoster;
    private String showDate;
    private String startTime;
    private String roomName;
    private String branchName;
    private Long branchId;
    private String seatName;
    private String bookingStatus;
    private String customerName;
    private String customerEmail;
    private Boolean isScanned;
    private Boolean isComboRedeemed; // Keep as fallback
    private List<ComboSummaryDto> combos;
    private String scannedAt;
    
    // New fields for general booking lookup
    private Boolean isGeneralBooking;
    private List<TicketSummaryDto> allTickets;
}
