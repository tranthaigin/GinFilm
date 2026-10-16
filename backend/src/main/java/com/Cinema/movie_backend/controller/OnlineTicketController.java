package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.service.OnlineTicketActivationService;
import lombok.RequiredArgsConstructor;
import com.Cinema.movie_backend.util.JwtUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import java.util.List;
import java.util.stream.Collectors;
import com.Cinema.movie_backend.repository.TicketRepository;
import com.Cinema.movie_backend.entity.Ticket;
import com.Cinema.movie_backend.DTO.TicketScanDto;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class OnlineTicketController {

    private final OnlineTicketActivationService activationService;
    private final JwtUtil jwtUtil;
    private final TicketRepository ticketRepository;

    @GetMapping("/scan/{code}")
    public ResponseEntity<?> scanTicket(@PathVariable String code) {
        List<Ticket> tickets = ticketRepository.findByTicketCodeStartingWith(code.split("-")[0]);
        if (tickets == null || tickets.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Không tìm thấy mã vé này."));
        }

        Ticket firstTicket = tickets.get(0);
        com.Cinema.movie_backend.entity.Booking booking = firstTicket.getBooking();
        com.Cinema.movie_backend.entity.Showtime showtime = firstTicket.getShowtime();

        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm");

        List<String> seats = tickets.stream()
                .map(t -> t.getSeat().getRowSymbol() + t.getSeat().getSeatNumber())
                .collect(Collectors.toList());

        TicketScanDto scanDto = TicketScanDto.builder()
                .ticketCode(code)
                .movieName(showtime.getMovie().getTitle())
                .date(showtime.getShowDate().format(dateFormatter))
                .time(showtime.getStartTime().format(timeFormatter))
                .roomName(showtime.getRoom().getName())
                .branchName(showtime.getRoom().getTheater().getName())
                .seats(seats)
                .bookingStatus(booking.getStatus().name())
                .customerName(booking.getUser().getFullName())
                .customerEmail(booking.getUser().getEmail())
                .build();

        return ResponseEntity.ok(scanDto);
    }

    @PostMapping("/activate")
    public ResponseEntity<?> activateTicket(
            @CookieValue(value = "accessToken", required = false) String tokenAuth,
            @RequestBody Map<String, Object> payload,
            HttpServletRequest request) {

        if (tokenAuth == null || tokenAuth.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Vui lòng đăng nhập"));
        }

        try {
            String email = jwtUtil.extractEmail(tokenAuth);

            String ticketCode = (String) payload.get("ticketCode");
            String pinCode = (String) payload.get("pinCode");
            boolean forceOverride = payload.containsKey("forceOverride") && (Boolean) payload.get("forceOverride");
            boolean isActivateIntent = payload.containsKey("isActivateIntent") && (Boolean) payload.get("isActivateIntent");

            // Use the device ID from the request as the unique identifier for the machine/browser
            String sessionId = payload.containsKey("deviceId")
                ? (String) payload.get("deviceId")
                : request.getSession().getId();

            // Get IP Address
            String ipAddress = request.getHeader("X-Forwarded-For");
            if (ipAddress == null || ipAddress.isEmpty() || "unknown".equalsIgnoreCase(ipAddress)) {
                ipAddress = request.getRemoteAddr();
            }

            String deviceInfo = extractDeviceInfo(request);

            Map<String, Object> result = activationService.activateOrWatchTicket(
                    email,
                    ticketCode,
                    pinCode,
                    forceOverride,
                    sessionId,
                    isActivateIntent,
                    ipAddress,
                    deviceInfo
            );

            Map<String, Object> responseBody = new java.util.HashMap<>();
            responseBody.put("message", "Xác thực thành công");
            responseBody.put("streamToken", result.get("token"));
            responseBody.put("movieId", result.get("movieId"));
            responseBody.put("expiresAt", result.get("expiresAt"));
            responseBody.put("consumedTimeSeconds", result.get("consumedTimeSeconds"));
            responseBody.put("timeLimitMinutes", result.get("timeLimitMinutes"));

            return ResponseEntity.ok(responseBody);
        } catch (RuntimeException e) {
            String message = e.getMessage();
            if (message.startsWith("CONCURRENT_STREAM_DETECTED:")) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                        "code", "CONCURRENT_STREAM",
                        "message", message.substring("CONCURRENT_STREAM_DETECTED:".length())
                ));
            }
            return ResponseEntity.badRequest().body(Map.of("message", message));
        }
    }

    @PostMapping("/check")
    public ResponseEntity<?> checkTicket(
            @CookieValue(value = "accessToken", required = false) String tokenAuth,
            @RequestBody Map<String, String> payload) {

        if (tokenAuth == null || tokenAuth.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Vui lòng đăng nhập"));
        }

        try {
            String email = jwtUtil.extractEmail(tokenAuth);
            String ticketCode = payload.get("ticketCode");

            boolean isActivated = activationService.isTicketActivated(email, ticketCode);
            return ResponseEntity.ok(Map.of("isActivated", isActivated));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/check-session")
    public ResponseEntity<?> checkSession(
            @CookieValue(value = "accessToken", required = false) String tokenAuth,
            @RequestBody Map<String, String> payload) {

        if (tokenAuth == null || tokenAuth.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Vui lòng đăng nhập"));
        }

        try {
            String ticketCode = payload.get("ticketCode");
            String deviceId = payload.get("deviceId");

            boolean isValid = activationService.isSessionValid(ticketCode, deviceId, jwtUtil.extractEmail(tokenAuth));
            return ResponseEntity.ok(Map.of("isValid", isValid));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/expired/{ticketCode}")
    public ResponseEntity<?> isTicketExpired(@PathVariable String ticketCode) {
        try {
            boolean isExpired = activationService.isTicketExpired(ticketCode);
            return ResponseEntity.ok(Map.of("isExpired", isExpired));
        } catch (RuntimeException e) {
            return ResponseEntity.ok(Map.of("isExpired", true));
        }
    }

    private String extractDeviceInfo(HttpServletRequest request) {
        if (request == null) return "Máy tính Windows (Edge)";
        String ua = request.getHeader("User-Agent");
        if (ua == null || ua.isEmpty()) return "Máy tính Windows (Edge)";

        String device = "Thiết bị khác";
        String uaLower = ua.toLowerCase();

        if (uaLower.contains("windows")) {
            device = "Máy tính Windows";
        } else if (uaLower.contains("macintosh") || uaLower.contains("mac os x")) {
            device = "Máy tính Mac";
        } else if (uaLower.contains("iphone")) {
            device = "Điện thoại iPhone";
        } else if (uaLower.contains("ipad")) {
            device = "Máy tính bảng iPad";
        } else if (uaLower.contains("android")) {
            if (uaLower.contains("mobile")) {
                device = "Điện thoại Android";
            } else {
                device = "Máy tính bảng Android";
            }
        } else if (uaLower.contains("linux")) {
            device = "Máy tính Linux";
        }

        String browser = "Trình duyệt khác";
        if (uaLower.contains("edg")) browser = "Edge";
        else if (uaLower.contains("chrome")) browser = "Chrome";
        else if (uaLower.contains("safari") && !uaLower.contains("chrome")) browser = "Safari";
        else if (uaLower.contains("firefox")) browser = "Firefox";
        else if (uaLower.contains("opera") || uaLower.contains("opr")) browser = "Opera";

        return device + " (" + browser + ")";
    }
}
