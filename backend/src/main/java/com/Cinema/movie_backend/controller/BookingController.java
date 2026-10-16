package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.DTO.HoldSeatRequest;
import com.Cinema.movie_backend.DTO.PaymentRequest;
import com.Cinema.movie_backend.DTO.UpdateComboRequest;
import com.Cinema.movie_backend.entity.Booking;
import com.Cinema.movie_backend.service.BookingService;
import lombok.RequiredArgsConstructor;
import com.Cinema.movie_backend.util.JwtUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    private final JwtUtil jwtUtil;

    @PostMapping("/hold")
    public ResponseEntity<?> holdSeats(@RequestBody HoldSeatRequest request,
                                       @CookieValue(value = "accessToken", required = false) String token) {
        if (token == null || token.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Vui lòng đăng nhập để đặt vé"));
        }

        try {
            String email = jwtUtil.extractEmail(token);
            if (email == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại"));
            }
            Booking booking = bookingService.holdSeats(request, email);
            Map<String, Object> responseData = new java.util.HashMap<>();
            responseData.put("id", booking.getId());
            responseData.put("expireAt", booking.getExpireAt());
            responseData.put("ticketCode", booking.getTicketCode());
            responseData.put("totalAmount", booking.getTotalAmount());
            return ResponseEntity.ok(responseData);
        } catch (org.springframework.security.access.AccessDeniedException | org.springframework.web.server.ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}/combo")
    public ResponseEntity<?> updateCombo(@PathVariable Long id, @jakarta.validation.Valid @RequestBody UpdateComboRequest request) {
        try {
            Booking booking = bookingService.updateCombo(id, request);
            return ResponseEntity.ok(Map.of("id", booking.getId(), "totalAmount", booking.getTotalAmount(), "status", booking.getStatus()));
        } catch (org.springframework.security.access.AccessDeniedException | org.springframework.web.server.ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/payment")
    public ResponseEntity<?> createPayment(@PathVariable Long id, @RequestBody PaymentRequest request) {
        try {
            String paymentUrl = bookingService.createPayment(id, request);
            return ResponseEntity.ok(Map.of("paymentUrl", paymentUrl));
        } catch (org.springframework.security.access.AccessDeniedException | org.springframework.web.server.ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/my-tickets")
    public ResponseEntity<?> getMyTickets(@CookieValue(value = "accessToken", required = false) String token) {
        if (token == null || token.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Vui lòng đăng nhập để xem vé"));
        }

        try {
            String email = jwtUtil.extractEmail(token);
            if (email == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại"));
            }
            java.util.List<com.Cinema.movie_backend.DTO.MyTicketDto> tickets = bookingService.getMyTickets(email);
            return ResponseEntity.ok(tickets);
        } catch (org.springframework.security.access.AccessDeniedException | org.springframework.web.server.ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage() != null ? e.getMessage() : e.toString()));
        }
    }

    @GetMapping("/shared-tickets")
    public ResponseEntity<?> getSharedTickets(@CookieValue(value = "accessToken", required = false) String token) {
        if (token == null || token.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Vui lòng đăng nhập để xem vé được chia sẻ"));
        }

        try {
            String email = jwtUtil.extractEmail(token);
            if (email == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại"));
            }
            java.util.List<com.Cinema.movie_backend.DTO.MyTicketDto> tickets = bookingService.getSharedTickets(email);
            return ResponseEntity.ok(tickets);
        } catch (org.springframework.security.access.AccessDeniedException | org.springframework.web.server.ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/online")
    public ResponseEntity<?> purchaseOnlineTicket(@RequestBody Map<String, Object> payload,
                                                @CookieValue(value = "accessToken", required = false) String token) {
        if (token == null || token.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Vui lòng đăng nhập để mua vé"));
        }

        try {
            String email = jwtUtil.extractEmail(token);
            if (email == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại"));
            }
            Long movieId = payload.get("movieId") != null ? Long.parseLong(payload.get("movieId").toString()) : null;
            if (movieId == null) throw new RuntimeException("Thiếu movieId");
            Double price = payload.get("price") != null ? Double.parseDouble(payload.get("price").toString()) : null;
            String paymentMethod = payload.get("paymentMethod") != null ? payload.get("paymentMethod").toString() : "";
            Integer pointsToUse = payload.get("pointsToUse") != null ? Integer.parseInt(payload.get("pointsToUse").toString()) : 0;
            String promoCode = payload.get("promoCode") != null ? payload.get("promoCode").toString() : null;

            String paymentUrl = bookingService.purchaseOnlineTicket(movieId, email, price, paymentMethod, pointsToUse, promoCode);
            return ResponseEntity.ok(Map.of("paymentUrl", paymentUrl));
        } catch (org.springframework.security.access.AccessDeniedException | org.springframework.web.server.ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/clear-all")
    public ResponseEntity<?> clearAllBookings(@CookieValue(value = "accessToken", required = false) String token) {
        if (token == null || token.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Vui lòng đăng nhập để thực hiện chức năng này"));
        }

        try {
            String email = jwtUtil.extractEmail(token);
            if (email == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại"));
            }
            bookingService.clearAllTickets(email);
            return ResponseEntity.ok(Map.of("message", "Đã xóa toàn bộ vé của bạn thành công"));
        } catch (org.springframework.security.access.AccessDeniedException | org.springframework.web.server.ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
