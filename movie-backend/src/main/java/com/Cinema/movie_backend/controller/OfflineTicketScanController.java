package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.DTO.OfflineTicketScanDto;
import com.Cinema.movie_backend.entity.Booking;
import com.Cinema.movie_backend.entity.BookingCombo;
import com.Cinema.movie_backend.entity.Showtime;
import com.Cinema.movie_backend.entity.Ticket;
import com.Cinema.movie_backend.repository.BookingRepository;
import com.Cinema.movie_backend.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/scan/offline")
@RequiredArgsConstructor
public class OfflineTicketScanController {

    private final TicketRepository ticketRepository;
    private final BookingRepository bookingRepository;

    @GetMapping("/{code}")
    public ResponseEntity<?> scanTicket(@PathVariable String code) {
        // If code has a hyphen (e.g. TK...-E10), it's a specific seat ticket
        boolean isGeneral = !code.contains("-");
        
        List<Ticket> tickets = ticketRepository.findByTicketCodeStartingWith(code.split("-")[0]);
        if (tickets == null || tickets.isEmpty()) {
            // Try by ID as fallback
            try {
                Long id = Long.parseLong(code);
                Optional<Ticket> opt = ticketRepository.findById(id);
                if (opt.isPresent()) {
                    tickets = List.of(opt.get());
                }
            } catch (NumberFormatException ignored) {}
        }
        
        if (tickets == null || tickets.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Mã vé không tồn tại trong hệ thống."));
        }

        Ticket targetTicket = tickets.get(0);
        if (!isGeneral) {
            // Find specific ticket
            targetTicket = tickets.stream()
                .filter(t -> code.equals(t.getTicketCode()))
                .findFirst()
                .orElse(tickets.get(0));
        }

        Booking booking = targetTicket.getBooking();
        Showtime showtime = targetTicket.getShowtime();

        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm");
        DateTimeFormatter scanTimeFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");

        List<com.Cinema.movie_backend.DTO.ComboSummaryDto> combos = new ArrayList<>();
        if (booking.getBookingCombos() != null) {
            for (BookingCombo bc : booking.getBookingCombos()) {
                if (bc.getCombo() != null) {
                    combos.add(com.Cinema.movie_backend.DTO.ComboSummaryDto.builder()
                        .id(bc.getCombo().getId())
                        .name(bc.getCombo().getName())
                        .quantity(bc.getQuantity())
                        .redeemedQuantity(bc.getRedeemedQuantity())
                        .redeemedBySeats(bc.getRedeemedBySeats())
                        .build());
                }
            }
        }

        List<com.Cinema.movie_backend.DTO.TicketSummaryDto> allTickets = new ArrayList<>();
        for (Ticket t : tickets) {
            String seat = (t.getSeat() != null) ? (t.getSeat().getRowSymbol() + t.getSeat().getSeatNumber()) : "N/A";
            allTickets.add(com.Cinema.movie_backend.DTO.TicketSummaryDto.builder()
                .ticketCode(t.getTicketCode())
                .seatName(seat)
                .isScanned(Boolean.TRUE.equals(t.getIsScanned()))
                .scannedAt(t.getScannedAt() != null ? t.getScannedAt().format(scanTimeFormatter) : null)
                .build());
        }

        String seatLabel = (targetTicket.getSeat() != null) 
                ? (targetTicket.getSeat().getRowSymbol() + targetTicket.getSeat().getSeatNumber()) 
                : "N/A";

        OfflineTicketScanDto dto = OfflineTicketScanDto.builder()
                .ticketCode(isGeneral ? targetTicket.getBooking().getTicketCode() : targetTicket.getTicketCode())
                .movieName(showtime.getMovie() != null ? showtime.getMovie().getTitle() : "N/A")
                .moviePoster(showtime.getMovie() != null ? showtime.getMovie().getPosterUrl() : null)
                .showDate(showtime.getShowDate() != null ? showtime.getShowDate().format(dateFormatter) : "")
                .startTime(showtime.getStartTime() != null ? showtime.getStartTime().format(timeFormatter) : "")
                .roomName(showtime.getRoom() != null ? showtime.getRoom().getName() : "N/A")
                .branchName(showtime.getRoom() != null && showtime.getRoom().getTheater() != null ? showtime.getRoom().getTheater().getName() : "N/A")
                .branchId(showtime.getRoom() != null && showtime.getRoom().getTheater() != null ? showtime.getRoom().getTheater().getId() : null)
                .seatName(isGeneral ? ("TỔNG " + tickets.size() + " GHẾ") : seatLabel)
                .bookingStatus(booking.getStatus() != null ? booking.getStatus().name() : "N/A")
                .customerName(booking.getUser() != null ? booking.getUser().getFullName() : "N/A")
                .customerEmail(booking.getUser() != null ? booking.getUser().getEmail() : "N/A")
                .isScanned(isGeneral ? tickets.stream().allMatch(t -> Boolean.TRUE.equals(t.getIsScanned())) : Boolean.TRUE.equals(targetTicket.getIsScanned()))
                .isComboRedeemed(Boolean.TRUE.equals(booking.getIsComboRedeemed()))
                .combos(combos)
                .scannedAt(isGeneral ? null : (targetTicket.getScannedAt() != null ? targetTicket.getScannedAt().format(scanTimeFormatter) : null))
                .isGeneralBooking(isGeneral)
                .allTickets(allTickets)
                .build();

        return ResponseEntity.ok(dto);
    }

    @PostMapping("/{code}/check-in")
    @Transactional
    public ResponseEntity<?> checkInTicket(@PathVariable String code, @RequestBody(required = false) Map<String, Object> payload) {
        boolean isGeneral = !code.contains("-");
        
        List<Ticket> tickets = ticketRepository.findByTicketCodeStartingWith(code.split("-")[0]);
        if (tickets == null || tickets.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Mã vé không tồn tại trong hệ thống."));
        }
        
        Booking booking = tickets.get(0).getBooking();
        
        if (isGeneral) {
            boolean anyTicketScanned = false;
            for(Ticket t : tickets) {
                if (!Boolean.TRUE.equals(t.getIsScanned())) {
                    t.setIsScanned(true);
                    t.setScannedAt(java.time.LocalDateTime.now());
                    ticketRepository.save(t);
                    anyTicketScanned = true;
                }
            }
            
            boolean anyComboRedeemed = false;
            if (booking.getBookingCombos() != null && !booking.getBookingCombos().isEmpty()) {
                for (BookingCombo bc : booking.getBookingCombos()) {
                    if (bc.getRedeemedQuantity() < bc.getQuantity()) {
                        bc.setRedeemedQuantity(bc.getQuantity());
                        String prev = bc.getRedeemedBySeats();
                        bc.setRedeemedBySeats((prev == null || prev.isEmpty()) ? "Tất cả" : (prev + ", Tất cả"));
                        anyComboRedeemed = true;
                    }
                }
                booking.setIsComboRedeemed(true);
                bookingRepository.save(booking);
            }
            
            if (!anyTicketScanned && !anyComboRedeemed) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "CẢNH BÁO: Tất cả vé và Combo trong đơn này đã được sử dụng trước đó!"));
            }
            
            return ResponseEntity.ok(Map.of("message", "Soát vé tổng & đổi toàn bộ Combo thành công!"));
        }

        Ticket ticket = tickets.stream()
            .filter(t -> code.equals(t.getTicketCode()))
            .findFirst()
            .orElse(null);
            
        if (ticket == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Mã vé không tồn tại trong hệ thống."));
        }

        if (Boolean.TRUE.equals(ticket.getIsScanned())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "CẢNH BÁO: Vé này đã được sử dụng (quét qua cửa) trước đó!"));
        }

        ticket.setIsScanned(true);
        ticket.setScannedAt(java.time.LocalDateTime.now());
        ticketRepository.save(ticket);

        String seatLabel = (ticket.getSeat() != null) 
            ? (ticket.getSeat().getRowSymbol() + ticket.getSeat().getSeatNumber()) 
            : code;

        // Check if this is the LAST unscanned seat in the booking
        long remainingUnscannedOthers = tickets.stream()
            .filter(t -> !t.getId().equals(ticket.getId()) && !Boolean.TRUE.equals(t.getIsScanned()))
            .count();
        boolean isLastSeat = (remainingUnscannedOthers == 0);

        int totalRedeemedNow = 0;

        if (isLastSeat) {
            // Auto-redeem ALL remaining unredeemed combos for the last seat
            if (booking.getBookingCombos() != null && !booking.getBookingCombos().isEmpty()) {
                for (BookingCombo bc : booking.getBookingCombos()) {
                    int remaining = bc.getQuantity() - bc.getRedeemedQuantity();
                    if (remaining > 0) {
                        bc.setRedeemedQuantity(bc.getQuantity());
                        String prev = bc.getRedeemedBySeats();
                        String tag = (remaining > 1) ? (seatLabel + " (x" + remaining + ")") : seatLabel;
                        bc.setRedeemedBySeats((prev == null || prev.isEmpty()) ? tag : (prev + ", " + tag));
                        totalRedeemedNow += remaining;
                    }
                }
                booking.setIsComboRedeemed(true);
                bookingRepository.save(booking);
            }
        } else if (payload != null && payload.containsKey("selectedCombos")) {
            Object obj = payload.get("selectedCombos");
            if (obj instanceof List<?>) {
                List<?> comboList = (List<?>) obj;
                for (Object itemObj : comboList) {
                    if (itemObj instanceof Map<?, ?>) {
                        Map<?, ?> itemMap = (Map<?, ?>) itemObj;
                        if (itemMap.containsKey("comboId") && itemMap.containsKey("quantity")) {
                            try {
                                java.util.UUID comboId = java.util.UUID.fromString(itemMap.get("comboId").toString());
                                int reqQty = Integer.parseInt(itemMap.get("quantity").toString());
                                
                                Optional<BookingCombo> optBc = booking.getBookingCombos().stream()
                                    .filter(bc -> bc.getCombo().getId().equals(comboId))
                                    .findFirst();
                                    
                                if (optBc.isPresent()) {
                                    BookingCombo bc = optBc.get();
                                    int remaining = bc.getQuantity() - bc.getRedeemedQuantity();
                                    int actualRedeem = Math.min(reqQty, remaining);
                                    if (actualRedeem > 0) {
                                        bc.setRedeemedQuantity(bc.getRedeemedQuantity() + actualRedeem);
                                        String prev = bc.getRedeemedBySeats();
                                        String tag = (actualRedeem > 1) ? (seatLabel + " (x" + actualRedeem + ")") : seatLabel;
                                        bc.setRedeemedBySeats((prev == null || prev.isEmpty()) ? tag : (prev + ", " + tag));
                                        totalRedeemedNow += actualRedeem;
                                    }
                                }
                            } catch (Exception ignored) {}
                        }
                    }
                }
                
                if (totalRedeemedNow > 0) {
                    boolean allRedeemed = booking.getBookingCombos().stream()
                        .allMatch(bc -> bc.getRedeemedQuantity() >= bc.getQuantity());
                    booking.setIsComboRedeemed(allRedeemed);
                    bookingRepository.save(booking);
                }
            }
        }

        String msg = "Soát vé (Check-in) ghế " + seatLabel + " thành công!";
        if (isLastSeat && totalRedeemedNow > 0) {
            msg += " Đây là ghế cuối cùng nên hệ thống đã tự động đổi toàn bộ " + totalRedeemedNow + " phần Combo còn lại.";
        } else if (totalRedeemedNow > 0) {
            msg += " Đã đổi " + totalRedeemedNow + " phần combo đi kèm.";
        }

        return ResponseEntity.ok(Map.of("message", msg));
    }

    @PostMapping("/{code}/redeem-combo")
    @Transactional
    public ResponseEntity<?> redeemCombo(@PathVariable String code, @RequestBody(required = false) Map<String, Object> payload) {
        List<Ticket> tickets = ticketRepository.findByTicketCodeStartingWith(code.split("-")[0]);
        if (tickets == null || tickets.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Mã vé không tồn tại trong hệ thống."));
        }

        Booking booking = tickets.get(0).getBooking();
        
        // Handle partial redemption
        if (payload != null && payload.containsKey("comboId") && payload.containsKey("seatName")) {
            java.util.UUID comboId = java.util.UUID.fromString(payload.get("comboId").toString());
            String seatName = payload.get("seatName").toString();
            
            Optional<BookingCombo> optBc = booking.getBookingCombos().stream()
                .filter(bc -> bc.getCombo().getId().equals(comboId))
                .findFirst();
                
            if (optBc.isPresent()) {
                BookingCombo bc = optBc.get();
                if (bc.getRedeemedQuantity() >= bc.getQuantity()) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("message", "Combo này đã được nhận hết!"));
                }
                bc.setRedeemedQuantity(bc.getRedeemedQuantity() + 1);
                
                String redeemedBy = bc.getRedeemedBySeats();
                if (redeemedBy == null || redeemedBy.isEmpty()) {
                    redeemedBy = seatName;
                } else {
                    redeemedBy += ", " + seatName;
                }
                bc.setRedeemedBySeats(redeemedBy);
                
                // Check if all combos in the booking are fully redeemed
                boolean allRedeemed = true;
                for (BookingCombo b : booking.getBookingCombos()) {
                    if (b.getRedeemedQuantity() < b.getQuantity()) {
                        allRedeemed = false;
                        break;
                    }
                }
                booking.setIsComboRedeemed(allRedeemed);
                bookingRepository.save(booking); // Cascades to BookingCombo
                
                return ResponseEntity.ok(Map.of("message", "Đã đổi 1 phần combo cho ghế " + seatName));
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Không tìm thấy combo trong đơn hàng này."));
            }
        }

        // Fallback: Redeem ALL combos
        if (Boolean.TRUE.equals(booking.getIsComboRedeemed())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Bắp nước thuộc hóa đơn này đã được nhận trước đó!"));
        }

        booking.setIsComboRedeemed(true);
        for(BookingCombo bc : booking.getBookingCombos()) {
            bc.setRedeemedQuantity(bc.getQuantity());
            bc.setRedeemedBySeats("Tất cả");
        }
        bookingRepository.save(booking);

        return ResponseEntity.ok(Map.of("message", "Đổi toàn bộ Bắp Nước thành công!"));
    }
}
