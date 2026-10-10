package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.DTO.HoldSeatRequest;
import com.Cinema.movie_backend.DTO.MovieShowtimeDto;
import com.Cinema.movie_backend.DTO.UpdateComboRequest;
import com.Cinema.movie_backend.entity.Booking;
import com.Cinema.movie_backend.entity.User;
import com.Cinema.movie_backend.service.BookingService;
import com.Cinema.movie_backend.service.ShowtimeService;
import com.Cinema.movie_backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/staff/pos")
@PreAuthorize("hasAnyAuthority('STAFF', 'ADMIN')")
@RequiredArgsConstructor
public class StaffPOSController {

    private final BookingService bookingService;
    private final ShowtimeService showtimeService;
    private final UserService userService;

    // 0. Lấy lịch chiếu theo rạp và ngày (dành cho POS - bao gồm suất đang chiếu chưa quá 5 phút)
    @GetMapping("/showtimes")
    public ResponseEntity<?> getPosShowtimes(
            @RequestParam Long theaterId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        try {
            List<MovieShowtimeDto> showtimes = showtimeService.getShowtimesByTheaterAndDateForPos(theaterId, date);
            return ResponseEntity.ok(showtimes);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Không thể tải danh sách suất chiếu: " + e.getMessage()));
        }
    }

    // 1. Giữ ghế (bước chọn ghế)
    @PostMapping("/bookings/hold")
    public ResponseEntity<?> holdSeats(@RequestBody HoldSeatRequest request,
                                       @RequestParam(required = false) UUID customerId) {
        try {
            Booking booking = bookingService.holdSeatsPos(request, customerId);
            return ResponseEntity.ok(Map.of(
                "message", "Giữ ghế thành công",
                "bookingId", booking.getId(),
                "ticketCode", booking.getTicketCode()
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // 2. Cập nhật bắp nước
    @PutMapping("/bookings/{bookingId}/combo")
    public ResponseEntity<?> updateCombo(@PathVariable Long bookingId,
                                         @RequestBody UpdateComboRequest request) {
        try {
            Booking booking = bookingService.updateComboPos(bookingId, request);
            return ResponseEntity.ok(Map.of(
                "message", "Cập nhật bắp nước thành công",
                "bookingId", booking.getId(),
                "totalAmount", booking.getTotalAmount()
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // 3. Thanh toán
    @PostMapping("/bookings/{bookingId}/payment")
    public ResponseEntity<?> processPayment(@PathVariable Long bookingId,
                                            @RequestBody Map<String, Object> request) {
        try {
            Map<String, Object> result = bookingService.processPaymentPos(bookingId, request);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/users/search")
    public ResponseEntity<?> searchUser(@RequestParam String query) {
        try {
            User user;
            if (query.contains("@")) {
                user = userService.findByEmail(query);
            } else {
                user = userService.searchByPhone(query);
            }
            
            if (user == null) {
                return ResponseEntity.status(400).body(Map.of("message", "Không tìm thấy khách hàng với thông tin này"));
            }
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/users/quick-register")
    public ResponseEntity<?> quickRegister(@RequestBody Map<String, String> payload) {
        try {
            String fullName = payload.get("fullName");
            String phoneNumber = payload.get("phoneNumber");
            User user = userService.quickRegisterByPOS(fullName, phoneNumber);
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
