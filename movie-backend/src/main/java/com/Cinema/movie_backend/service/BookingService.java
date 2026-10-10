package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.DTO.ComboItemRequest;
import com.Cinema.movie_backend.DTO.HoldSeatRequest;
import com.Cinema.movie_backend.DTO.UpdateComboRequest;
import com.Cinema.movie_backend.entity.*;
import com.Cinema.movie_backend.enums.BookingStatus;
import com.Cinema.movie_backend.enums.PaymentMethod;
import com.Cinema.movie_backend.enums.PaymentStatus;
import com.Cinema.movie_backend.repository.*;
import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;



import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final TicketRepository ticketRepository;
    private final BookingComboRepository bookingComboRepository;
    private final PaymentRepository paymentRepository;
    private final ShowtimeRepository showtimeRepository;
    private final SeatRepository seatRepository;
    private final UserRepository userRepository;
    private final ComboRepository comboRepository;
    private final com.Cinema.movie_backend.repository.OnlineTicketRepository onlineTicketRepository;
    private final com.Cinema.movie_backend.repository.OnlineMoviePriceRepository onlineMoviePriceRepository;
    private final com.Cinema.movie_backend.repository.MovieRepository movieRepository;
    private final com.Cinema.movie_backend.repository.TicketPriceRepository ticketPriceRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final VnpayService vnpayService;
    private final PromotionService promotionService;
    private final SystemConfigService systemConfigService;
    private final MemberPointService memberPointService;

    @org.springframework.beans.factory.annotation.Value("${app.backend.url:http://localhost:8080}")
    private String backendUrl;

    @Transactional
    public Booking holdSeats(HoldSeatRequest request, String email) {
        Showtime showtime = showtimeRepository.findById(request.getShowtimeId())
                .orElseThrow(() -> new RuntimeException("Suất chiếu không tồn tại hoặc đã bị xóa"));

        User user = userRepository.findByEmailManual(email)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));

        // Kiểm tra maxSeatsPerUser
        Integer maxSeatsPerUser = showtime.getRoom().getMaxSeatsPerUser();
        if (maxSeatsPerUser != null && maxSeatsPerUser > 0 && request.getSeatIds().size() > maxSeatsPerUser) {
            throw new RuntimeException("Bạn chỉ được giữ tối đa " + maxSeatsPerUser + " ghế trong rạp này.");
        }

        // Kiểm tra xem ghế đã bị đặt hay giữ chưa
        List<Long> reservedSeats = ticketRepository.findReservedSeatIdsByShowtime(showtime.getId());
        for (Long seatId : request.getSeatIds()) {
            if (reservedSeats.contains(seatId)) {
                Seat seat = seatRepository.findById(seatId).orElse(null);
                String seatName = seat != null ? (seat.getRowSymbol() + seat.getSeatNumber()) : String.valueOf(seatId);
                throw new RuntimeException("Ghế " + seatName + " đã có người đặt hoặc giữ.");
            }
        }

        // Tạo đơn hàng PENDING
        Booking booking = Booking.builder()
                .user(user)
                .showtime(showtime)
                .bookingTime(LocalDateTime.now())
                .expireAt(LocalDateTime.now().plusMinutes(5)) // User requested 5 minutes
                .status(BookingStatus.PENDING)
                .totalAmount(0.0) // Sẽ tính sau
                .build();

        booking = bookingRepository.save(booking);

        double totalAmount = 0.0;
        List<Ticket> tickets = new ArrayList<>();
        String generatedTicketCode = "TK" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        com.Cinema.movie_backend.enums.AudienceType audience = com.Cinema.movie_backend.enums.AudienceType.ADULT;
        com.Cinema.movie_backend.enums.RoomType roomType = (showtime.getRoom() != null
                && showtime.getRoom().getRoomType() != null) ? showtime.getRoom().getRoomType()
                        : com.Cinema.movie_backend.enums.RoomType.LO_RAP;
        java.time.DayOfWeek dow = showtime.getShowDate().getDayOfWeek();
        com.Cinema.movie_backend.enums.DayType dayType = (dow == java.time.DayOfWeek.FRIDAY
                || dow == java.time.DayOfWeek.SATURDAY || dow == java.time.DayOfWeek.SUNDAY)
                        ? com.Cinema.movie_backend.enums.DayType.WEEKEND
                        : com.Cinema.movie_backend.enums.DayType.WEEKDAY;
        java.time.LocalDate today = java.time.LocalDate.now();

        for (Long seatId : request.getSeatIds()) {
            Seat seat = seatRepository.findById(seatId)
                    .orElseThrow(() -> new RuntimeException("Ghế không tồn tại"));

            final com.Cinema.movie_backend.enums.SeatType finalSType;
            if (seat.getSeatType() != null && seat.getSeatType().equalsIgnoreCase("VIP")) {
                finalSType = com.Cinema.movie_backend.enums.SeatType.VIP;
            } else if (seat.getSeatType() != null && (seat.getSeatType().equalsIgnoreCase("COUPLE")
                    || seat.getSeatType().equalsIgnoreCase("SWEETBOX"))) {
                finalSType = com.Cinema.movie_backend.enums.SeatType.SWEETBOX;
            } else if (seat.getSeatType() != null && seat.getSeatType().equalsIgnoreCase("BED")) {
                finalSType = com.Cinema.movie_backend.enums.SeatType.BED;
            } else {
                finalSType = com.Cinema.movie_backend.enums.SeatType.NORMAL;
            }

            double seatPrice = ticketPriceRepository.findActivePrice(audience, finalSType, roomType, dayType, today)
                    .map(tp -> tp.getPrice().doubleValue())
                    .orElseThrow(() -> new RuntimeException("Chưa cấu hình giá cho loại ghế " + finalSType.name() + " trong phòng " + roomType.name()));

            Ticket ticket = Ticket.builder()
                    .booking(booking)
                    .seat(seat)
                    .showtime(showtime)
                    .price(seatPrice)
                    .ticketCode(generatedTicketCode + "-" + seat.getRowSymbol() + seat.getSeatNumber())
                    .build();

            tickets.add(ticket);
            totalAmount += seatPrice;
        }

        try {
            ticketRepository.saveAllAndFlush(tickets);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new RuntimeException("Một hoặc nhiều ghế bạn chọn vừa được người khác đặt. Vui lòng chọn ghế khác.");
        }
        booking.setTotalAmount(totalAmount);
        Booking savedBooking = bookingRepository.save(booking);
        savedBooking.setTicketCode(generatedTicketCode);
        return savedBooking;
    }

    @Transactional
    public Booking updateCombo(Long bookingId, UpdateComboRequest request) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Đơn hàng không tồn tại"));

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new RuntimeException("Chỉ có thể cập nhật combo cho đơn hàng đang chờ.");
        }

        // Xóa combo cũ nếu có
        if (booking.getBookingCombos() != null) {
            bookingComboRepository.deleteAll(booking.getBookingCombos());
        }

        double comboTotal = 0.0;
        List<BookingCombo> bookingCombos = new ArrayList<>();

        for (ComboItemRequest item : request.getCombos()) {
            Combo combo = comboRepository.findById(item.getComboId())
                    .orElseThrow(() -> new RuntimeException("Combo không tồn tại"));

            double itemPrice = combo.getPrice() * item.getQuantity();
            BookingCombo bookingCombo = BookingCombo.builder()
                    .booking(booking)
                    .combo(combo)
                    .quantity(item.getQuantity())
                    .price(itemPrice)
                    .build();

            bookingCombos.add(bookingCombo);
            comboTotal += itemPrice;
        }

        bookingComboRepository.saveAll(bookingCombos);

        // Tính lại tổng tiền (giá vé + combo)
        double ticketTotal = ticketRepository.findByBookingId(bookingId).stream()
                .mapToDouble(Ticket::getPrice)
                .sum();

        booking.setTotalAmount(ticketTotal + comboTotal);
        return bookingRepository.save(booking);
    }

    @Transactional
    public Booking holdSeatsPos(HoldSeatRequest request, UUID customerId) {
        Showtime showtime = showtimeRepository.findById(request.getShowtimeId())
                .orElseThrow(() -> new RuntimeException("Suất chiếu không tồn tại hoặc đã bị xóa"));

        User user;
        if (customerId != null) {
            user = userRepository.findById(customerId)
                    .orElseThrow(() -> new RuntimeException("Khách hàng không tồn tại"));
        } else {
            user = userRepository.findByEmailManual("guest@cinema.com")
                    .orElseGet(() -> {
                        User guest = new User();
                        guest.setUsername("guest_pos");
                        guest.setEmail("guest@cinema.com");
                        guest.setFullName("Khách Vãng Lai");
                        guest.setPassword("123456");
                        guest.setStatus(com.Cinema.movie_backend.entity.UserStatus.ACTIVE);
                        // Bỏ qua roles cho guest hoặc xử lý sau nếu bắt buộc
                        guest.setRewardPoints(0);
                        guest.setMemberPoints(0);
                        return userRepository.save(guest);
                    });
        }

        // Kiểm tra maxSeatsPerUser
        Integer maxSeatsPerUser = showtime.getRoom().getMaxSeatsPerUser();
        if (maxSeatsPerUser != null && maxSeatsPerUser > 0 && request.getSeatIds().size() > maxSeatsPerUser) {
            throw new RuntimeException("Bạn chỉ được giữ tối đa " + maxSeatsPerUser + " ghế trong rạp này.");
        }

        // Kiểm tra xem ghế đã bị đặt hay giữ chưa
        List<Long> reservedSeats = ticketRepository.findReservedSeatIdsByShowtime(showtime.getId());
        for (Long seatId : request.getSeatIds()) {
            if (reservedSeats.contains(seatId)) {
                Seat seat = seatRepository.findById(seatId).orElse(null);
                String seatName = seat != null ? (seat.getRowSymbol() + seat.getSeatNumber()) : String.valueOf(seatId);
                throw new RuntimeException("Ghế " + seatName + " đã có người đặt hoặc giữ.");
            }
        }

        Booking booking = Booking.builder()
                .user(user)
                .showtime(showtime)
                .bookingTime(LocalDateTime.now())
                .expireAt(LocalDateTime.now().plusMinutes(10)) // POS có 10 phút
                .status(BookingStatus.PENDING)
                .totalAmount(0.0)
                .build();

        booking = bookingRepository.save(booking);

        double totalAmount = 0.0;
        List<Ticket> tickets = new ArrayList<>();
        String generatedTicketCode = "POS" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        com.Cinema.movie_backend.enums.AudienceType audience = com.Cinema.movie_backend.enums.AudienceType.ADULT;
        com.Cinema.movie_backend.enums.RoomType roomType = (showtime.getRoom() != null
                && showtime.getRoom().getRoomType() != null) ? showtime.getRoom().getRoomType()
                        : com.Cinema.movie_backend.enums.RoomType.LO_RAP;
        java.time.DayOfWeek dow = showtime.getShowDate().getDayOfWeek();
        com.Cinema.movie_backend.enums.DayType dayType = (dow == java.time.DayOfWeek.FRIDAY
                || dow == java.time.DayOfWeek.SATURDAY || dow == java.time.DayOfWeek.SUNDAY)
                        ? com.Cinema.movie_backend.enums.DayType.WEEKEND
                        : com.Cinema.movie_backend.enums.DayType.WEEKDAY;
        java.time.LocalDate today = java.time.LocalDate.now();

        for (Long seatId : request.getSeatIds()) {
            Seat seat = seatRepository.findById(seatId)
                    .orElseThrow(() -> new RuntimeException("Ghế không tồn tại"));

            final com.Cinema.movie_backend.enums.SeatType finalSType;
            if (seat.getSeatType() != null && seat.getSeatType().equalsIgnoreCase("VIP")) {
                finalSType = com.Cinema.movie_backend.enums.SeatType.VIP;
            } else if (seat.getSeatType() != null && (seat.getSeatType().equalsIgnoreCase("COUPLE")
                    || seat.getSeatType().equalsIgnoreCase("SWEETBOX"))) {
                finalSType = com.Cinema.movie_backend.enums.SeatType.SWEETBOX;
            } else if (seat.getSeatType() != null && seat.getSeatType().equalsIgnoreCase("BED")) {
                finalSType = com.Cinema.movie_backend.enums.SeatType.BED;
            } else {
                finalSType = com.Cinema.movie_backend.enums.SeatType.NORMAL;
            }

            double seatPrice = ticketPriceRepository.findActivePrice(audience, finalSType, roomType, dayType, today)
                    .map(tp -> tp.getPrice().doubleValue())
                    .orElseThrow(() -> new RuntimeException("Chưa cấu hình giá cho loại ghế " + finalSType.name() + " trong phòng " + roomType.name()));

            Ticket ticket = Ticket.builder()
                    .booking(booking)
                    .seat(seat)
                    .showtime(showtime)
                    .price(seatPrice)
                    .ticketCode(generatedTicketCode + "-" + seat.getRowSymbol() + seat.getSeatNumber())
                    .build();

            tickets.add(ticket);
            totalAmount += seatPrice;
        }

        try {
            ticketRepository.saveAllAndFlush(tickets);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new RuntimeException("Một hoặc nhiều ghế bạn chọn vừa được người khác đặt. Vui lòng chọn ghế khác.");
        }
        booking.setTotalAmount(totalAmount);
        Booking savedBooking = bookingRepository.save(booking);
        savedBooking.setTicketCode(generatedTicketCode);
        return savedBooking;
    }

    @Transactional
    public Booking updateComboPos(Long bookingId, UpdateComboRequest request) {
        return updateCombo(bookingId, request);
    }

    @Transactional
    public String createPayment(Long bookingId, com.Cinema.movie_backend.DTO.PaymentRequest request) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Đơn hàng không tồn tại"));

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new RuntimeException("Đơn hàng không ở trạng thái hợp lệ để thanh toán.");
        }

        PaymentMethod method = request.getPaymentMethod();

        double ticketTotal = 0;
        if (booking.getTickets() != null) {
            ticketTotal = booking.getTickets().stream().mapToDouble(t -> t.getPrice()).sum();
        }
        double comboTotal = 0;
        if (booking.getBookingCombos() != null) {
            comboTotal = booking.getBookingCombos().stream().mapToDouble(c -> c.getPrice()).sum();
        }
        double baseTotal = ticketTotal + comboTotal;

        double finalTotalAmount = baseTotal;
        String promoCode = request.getPromoCode();
        if (promoCode != null && !promoCode.trim().isEmpty()) {
            double discountAmount = promotionService.applyPromotion(promoCode, ticketTotal, comboTotal, booking.getUser().getId());
            if (discountAmount > 0) {
                com.Cinema.movie_backend.entity.Promotion promotion = promotionService.getPromotionByCode(promoCode);
                booking.setPromotion(promotion);
                finalTotalAmount = Math.max(0.0, baseTotal - discountAmount);
            } else {
                booking.setPromotion(null);
            }
        } else {
            booking.setPromotion(null);
        }

        Integer pointsToUse = request.getPointsToUse();
        int actualPointsToUse = 0;
        if (pointsToUse != null && pointsToUse > 0) {
            int minPoints = systemConfigService.getMinRlfPoints();
            int minCash = systemConfigService.getMinCashVnd();

            if (pointsToUse < minPoints) {
                throw new IllegalArgumentException("Số điểm sử dụng phải lớn hơn hoặc bằng " + minPoints);
            }

            User user = booking.getUser();
            Integer userPoints = user.getRewardPoints() != null ? user.getRewardPoints() : 0;
            if (userPoints < pointsToUse) {
                throw new IllegalArgumentException("Không đủ điểm thưởng để sử dụng.");
            }
            
            double maxDiscountableTicket = Math.max(0.0, ticketTotal - minCash);
            int maxPointsAllowed = (int) (maxDiscountableTicket / 1000);

            if (pointsToUse > maxPointsAllowed) {
                throw new IllegalArgumentException("Chỉ có thể dùng tối đa " + maxPointsAllowed + " điểm để giữ lại " + minCash + " VNĐ thanh toán cho vé.");
            }

            actualPointsToUse = pointsToUse;
            if (actualPointsToUse > 0) {
                double pointDiscount = actualPointsToUse * 1000;
                finalTotalAmount = Math.max(0.0, finalTotalAmount - pointDiscount);
                
                user.setRewardPoints(userPoints - actualPointsToUse);
                userRepository.save(user);
                booking.setPointsUsed(actualPointsToUse);
            }
        }

        booking.setTotalAmount(finalTotalAmount);

        String ticketCode = "UNKNOWN";
        if (booking.getTickets() != null && !booking.getTickets().isEmpty()) {
            ticketCode = booking.getTickets().get(0).getTicketCode().split("-")[0];
        }

        booking.setPaymentMethod(method);
        String transactionNo = ticketCode; // Use ticketCode instead of UUID for consistent invoice numbers

        if (method == PaymentMethod.VNPAY) {
            // Chỉ lưu trạng thái PENDING, chưa COMPLETED
            Payment payment = Payment.builder()
                    .booking(booking)
                    .amount(booking.getTotalAmount())
                    .paymentTime(LocalDateTime.now())
                    .status(PaymentStatus.PENDING)
                    .method(method)
                    .transactionNo(transactionNo)
                    .build();
            paymentRepository.save(payment);

            String orderInfo = "Thanh toan ve xem phim LoFilm";
            String returnUrl = backendUrl + "/api/payment/vnpay-callback";

            return vnpayService.createPaymentUrl((long) finalTotalAmount, orderInfo, returnUrl,
                    transactionNo);
        }

        // Với các phương thức khác (mock)
        booking.setStatus(BookingStatus.COMPLETED); // Mock: Đánh dấu thành công luôn
        
        int pointsEarned = 0;
        if ((booking.getPointsUsed() == null || booking.getPointsUsed() == 0) && booking.getPromotion() == null) {
            pointsEarned = (int) (booking.getTotalAmount() / 20000);
        }
        User userForReward = booking.getUser();
        int memberPointsEarned = memberPointService.award(userForReward, booking.getTotalAmount());
        if (userForReward != null && (pointsEarned > 0 || memberPointsEarned > 0)) {
            if (pointsEarned > 0) {
                userForReward.setRewardPoints(
                        (userForReward.getRewardPoints() != null ? userForReward.getRewardPoints() : 0)
                                + pointsEarned);
            }
            userRepository.save(userForReward);
            booking.setPointsEarned(pointsEarned);
            booking.setMemberPointsEarned(memberPointsEarned);
        }
        
        bookingRepository.save(booking);

        Payment payment = Payment.builder()
                .booking(booking)
                .amount(booking.getTotalAmount())
                .paymentTime(LocalDateTime.now())
                .status(PaymentStatus.SUCCESS) // Mock: Đánh dấu thành công luôn
                .method(method)
                .transactionNo(transactionNo)
                .build();

        paymentRepository.save(payment);

        // Gửi thông báo
        String ticketCodeForNotif = booking.getTicketCode() != null ? booking.getTicketCode()
                : ("TK" + booking.getId());
        String notificationMessage = String.format(
                "Đơn hàng **%s** đã được thanh toán thành công qua %s. Hẹn gặp bạn tại rạp nhé!",
                ticketCodeForNotif, method.name());
        String redirectLink = "/my-tickets?ticketCode=" + ticketCodeForNotif;
        notificationService.sendNotification(booking.getUser(), "Thanh toán vé xem phim thành công!",
                notificationMessage, redirectLink, NotificationType.TRANSACTION);

        // Gửi email xác nhận
        List<Ticket> tickets = ticketRepository.findByBookingId(bookingId);
        emailService.sendCinemaTicketEmail(booking.getUser().getEmail(), booking.getUser().getFullName(), booking,
                tickets);

        // Trả về chuỗi rỗng để frontend tự động chuyển hướng qua trang Vé Của Tôi
        return "";
    }

    @Transactional
    public java.util.Map<String, Object> processPaymentPos(Long bookingId, java.util.Map<String, Object> request) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Đơn hàng không tồn tại"));

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new RuntimeException("Đơn hàng không ở trạng thái hợp lệ để thanh toán.");
        }

        String paymentMethodStr = (String) request.getOrDefault("paymentMethod", "CASH");
        PaymentMethod method = PaymentMethod.valueOf(paymentMethodStr);

        // Fetch ticket code manually because it's @Transient
        String ticketCode = "UNKNOWN";
        List<Ticket> tickets = ticketRepository.findByBookingId(bookingId);
        if (!tickets.isEmpty() && tickets.get(0).getTicketCode() != null) {
            ticketCode = tickets.get(0).getTicketCode().split("-")[0];
        }

        if (method == PaymentMethod.VNPAY) {
            booking.setPaymentMethod(method);
            booking.setStatus(BookingStatus.PENDING);
            bookingRepository.save(booking);

            String transactionNo = "POS-" + UUID.randomUUID().toString().substring(0, 8);

            Payment payment = Payment.builder()
                    .booking(booking)
                    .amount(booking.getTotalAmount())
                    .paymentTime(LocalDateTime.now())
                    .status(PaymentStatus.PENDING)
                    .method(method)
                    .transactionNo(transactionNo)
                    .build();
            paymentRepository.save(payment);

            String returnUrl = backendUrl + "/api/payment/vnpay-callback";
            String orderInfo = "Thanh toan POS ma " + ticketCode;
            String paymentUrl = vnpayService.createPaymentUrl(booking.getTotalAmount().longValue(), orderInfo,
                    returnUrl, transactionNo);

            return java.util.Map.of(
                    "message", "Redirect to VNPAY",
                    "paymentUrl", paymentUrl,
                    "ticketCode", ticketCode);
        }

        booking.setPaymentMethod(method);
        booking.setStatus(BookingStatus.COMPLETED);
        
        int posPointsEarned = 0;
        if ((booking.getPointsUsed() == null || booking.getPointsUsed() == 0) && booking.getPromotion() == null) {
            posPointsEarned = (int) (booking.getTotalAmount() / 20000);
        }
        User posUser = booking.getUser();
        int posMemberPointsEarned = 0;
        if (posUser != null && !posUser.getEmail().equals("guest@cinema.com")) {
            posMemberPointsEarned = memberPointService.award(posUser, booking.getTotalAmount());
        }
        if (posUser != null && !posUser.getEmail().equals("guest@cinema.com")
                && (posPointsEarned > 0 || posMemberPointsEarned > 0)) {
            if (posPointsEarned > 0) {
                posUser.setRewardPoints(
                        (posUser.getRewardPoints() != null ? posUser.getRewardPoints() : 0) + posPointsEarned);
            }
            userRepository.save(posUser);
            booking.setPointsEarned(posPointsEarned);
            booking.setMemberPointsEarned(posMemberPointsEarned);
        }
        
        booking = bookingRepository.save(booking);

        String transactionNo = "POS-" + UUID.randomUUID().toString().substring(0, 8);

        Payment payment = Payment.builder()
                .booking(booking)
                .amount(booking.getTotalAmount())
                .paymentTime(LocalDateTime.now())
                .status(PaymentStatus.SUCCESS)
                .method(method)
                .transactionNo(transactionNo)
                .build();

        paymentRepository.save(payment);

        // Gửi thông báo và email (Chỉ gửi nếu là user thật, không phải guest)
        if (!booking.getUser().getEmail().equals("guest@cinema.com")) {
            String notificationMessage = String.format("Đơn hàng **%s** đã được thanh toán thành công tại quầy POS.",
                    ticketCode);
            String redirectLink = "/my-tickets?ticketCode=" + ticketCode;
            notificationService.sendNotification(booking.getUser(), "Thanh toán vé xem phim thành công!",
                    notificationMessage, redirectLink, NotificationType.TRANSACTION);

            emailService.sendCinemaTicketEmail(booking.getUser().getEmail(), booking.getUser().getFullName(), booking,
                    tickets);
        }

        return java.util.Map.of(
                "message", "Payment processed successfully",
                "bookingId", booking.getId(),
                "ticketCode", ticketCode);
    }

    @Transactional
    public List<com.Cinema.movie_backend.DTO.MyTicketDto> getMyTickets(String email) {
        List<com.Cinema.movie_backend.DTO.MyTicketDto> result = new ArrayList<>();
        java.time.format.DateTimeFormatter dateFmt = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");
        java.time.format.DateTimeFormatter timeFmt = java.time.format.DateTimeFormatter.ofPattern("HH:mm");

        // 1. Get Cinema Bookings
        List<Booking> bookings = bookingRepository.findByUserEmailOrderByBookingTimeDesc(email);
        for (Booking b : bookings) {
            if (b.getStatus() == BookingStatus.COMPLETED) {
                try {
                    Showtime s = b.getShowtime();
                    if (s != null && s.getMovie() != null && s.getTheater() != null && s.getRoom() != null) {
                        s.getId(); // Trigger lazy loading to check existence
                        s.getMovie().getId(); // Trigger movie as well
                        s.getTheater().getId();
                        s.getRoom().getId();
                    } else {
                        continue;
                    }

                    List<Ticket> tickets = ticketRepository.findByBookingId(b.getId());


                    List<String> seats = tickets.stream()
                            .map(t -> t.getSeat().getRowSymbol() + t.getSeat().getSeatNumber())
                            .collect(Collectors.toList());

                    String comboStr = "";
                    if (b.getBookingCombos() != null && !b.getBookingCombos().isEmpty()) {
                        comboStr = b.getBookingCombos().stream()
                                .map(c -> c.getQuantity() + " " + c.getCombo().getName())
                                .collect(Collectors.joining(" + "));
                    }

                    String dbTicketCode = null;
                    if (!tickets.isEmpty() && tickets.get(0).getTicketCode() != null) {
                        dbTicketCode = tickets.get(0).getTicketCode().split("-")[0];
                    } else if (b.getTicketCode() != null) {
                        dbTicketCode = b.getTicketCode();
                    } else {
                        dbTicketCode = "TK" + b.getId();
                    }

                    List<com.Cinema.movie_backend.DTO.MyTicketDto.TicketDetail> ticketDetails = tickets.stream()
                            .map(t -> com.Cinema.movie_backend.DTO.MyTicketDto.TicketDetail.builder()
                                    .seatName(t.getSeat().getRowSymbol() + t.getSeat().getSeatNumber())
                                    .ticketCode(t.getTicketCode())
                                    .isScanned(Boolean.TRUE.equals(t.getIsScanned()))
                                    .build())
                            .collect(Collectors.toList());

                    result.add(com.Cinema.movie_backend.DTO.MyTicketDto.builder()
                            .id(dbTicketCode)
                            .bookingCode("TK" + b.getId())
                            .movieId(s.getMovie().getId())
                            .movie(s.getMovie().getTitle())
                            .date(s.getShowDate().format(dateFmt))
                            .time(s.getStartTime().format(timeFmt))
                            .cinema(s.getTheater().getName() + " | " + s.getRoom().getName())
                            .total(b.getTotalAmount())
                            .type("cinema")
                            .poster(s.getMovie().getPosterUrl())
                            .seats(seats)
                            .combo(comboStr.isEmpty() ? null : comboStr)
                            .ticketDetails(ticketDetails)
                            .bookingTime(b.getBookingTime())
                            .build());
                } catch (Exception e) {
                    // Bỏ qua các vé mà suất chiếu hoặc phim đã bị xoá
                    continue;
                }
            }
        }

        // 2. Get Online Tickets
        List<OnlineTicket> onlineTickets = onlineTicketRepository.findByUserEmailOrderByPurchaseTimeDesc(email);
        for (OnlineTicket ot : onlineTickets) {
            if (Boolean.TRUE.equals(ot.getIsBanned()))
                continue;

            try {
                if (ot.getMovie() == null) continue;
                ot.getMovie().getId(); // Trigger lazy load
                
                result.add(com.Cinema.movie_backend.DTO.MyTicketDto.builder()
                        .id(ot.getTicketCode())
                        .movieId(ot.getMovie().getId())
                        .movie(ot.getMovie().getTitle())
                        .date(ot.getPurchaseTime().format(dateFmt))
                        .time(ot.getPurchaseTime().format(timeFmt))
                        .cinema("Xem trực tuyến")
                        .total(ot.getPrice())
                        .type("web")
                        .poster(ot.getMovie().getPosterUrl())
                        .isActivated(ot.getActivatedAt() != null)
                        .bookingTime(ot.getPurchaseTime())
                        .build());
            } catch (Exception e) {
                // Bỏ qua nếu lỗi (VD: phim bị xoá)
                continue;
            }
        }

        // Sort by booking time desc
        result.sort((t1, t2) -> {
            if (t1.getBookingTime() == null && t2.getBookingTime() == null) return 0;
            if (t1.getBookingTime() == null) return 1;
            if (t2.getBookingTime() == null) return -1;
            return t2.getBookingTime().compareTo(t1.getBookingTime());
        });

        return result;
    }

    public List<com.Cinema.movie_backend.DTO.MyTicketDto> getSharedTickets(String email) {
        List<com.Cinema.movie_backend.DTO.MyTicketDto> result = new ArrayList<>();
        java.time.format.DateTimeFormatter dateFmt = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");
        java.time.format.DateTimeFormatter timeFmt = java.time.format.DateTimeFormatter.ofPattern("HH:mm");

        List<OnlineTicket> onlineTickets = onlineTicketRepository.findSharedTickets(email);
        for (OnlineTicket ot : onlineTickets) {
            result.add(com.Cinema.movie_backend.DTO.MyTicketDto.builder()
                    .id(ot.getTicketCode())
                    .movieId(ot.getMovie().getId())
                    .movie(ot.getMovie().getTitle())
                    .date(ot.getActivatedAt() != null ? ot.getActivatedAt().format(dateFmt)
                            : ot.getPurchaseTime().format(dateFmt))
                    .time(ot.getActivatedAt() != null ? ot.getActivatedAt().format(timeFmt)
                            : ot.getPurchaseTime().format(timeFmt))
                    .cinema("Xem trực tuyến")
                    .total(0.0) // Not purchased by this user
                    .type("web")
                    .poster(ot.getMovie().getPosterUrl())
                    .isActivated(ot.getActivatedAt() != null)
                    .ownerEmail(ot.getUser().getEmail())
                    .build());
        }
        return result;
    }

    @Transactional
    public String purchaseOnlineTicket(Long movieId, String email, Double price, String paymentMethod, Integer pointsToUse, String promoCode) {
        User user = userRepository.findByEmailManual(email)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));

        Movie movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new RuntimeException("Phim không tồn tại"));

        if (movie.getIsOnlineAvailable() == null || !movie.getIsOnlineAvailable()) {
            throw new RuntimeException("Phim này không hỗ trợ xem trực tuyến");
        }

        int defaultBuffer = systemConfigService.getDefaultVodBufferMinutes();
        int movieDuration = (movie.getDuration() != null && movie.getDuration() > 0) ? movie.getDuration() : 120;
        Integer validityMins = movieDuration + defaultBuffer;

        // Generate ticket code
        String generatedTicketCode = "WEB-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        Double actualPrice = price != null ? price : 45000.0;
        
        if (pointsToUse != null && pointsToUse > 0) {
            int minPoints = systemConfigService.getMinRlfPoints();
            int minCash = systemConfigService.getMinCashVnd();

            if (pointsToUse < minPoints) {
                throw new IllegalArgumentException("Số điểm sử dụng phải lớn hơn hoặc bằng " + minPoints);
            }

            if (user.getRewardPoints() == null || user.getRewardPoints() < pointsToUse) {
                throw new IllegalArgumentException("Bạn không đủ điểm thưởng.");
            }

            double maxDiscountableTicket = Math.max(0.0, actualPrice - minCash);
            int maxPointsAllowed = (int) (maxDiscountableTicket / 1000);

            if (pointsToUse > maxPointsAllowed) {
                throw new IllegalArgumentException("Chỉ có thể dùng tối đa " + maxPointsAllowed + " điểm để giữ lại " + minCash + " VNĐ thanh toán cho vé.");
            }

            user.setRewardPoints(user.getRewardPoints() - pointsToUse);
            userRepository.save(user);
            actualPrice = Math.max(0.0, actualPrice - (pointsToUse * 1000));
        }

        OnlineTicket ticket = OnlineTicket.builder()
                .user(user)
                .movie(movie)
                .purchaseTime(LocalDateTime.now())
                .price(actualPrice)
                .ticketCode(generatedTicketCode)
                .timeLimitMinutes(validityMins)
                .isBanned("VNPAY".equalsIgnoreCase(paymentMethod))
                .pointsUsed(pointsToUse != null ? pointsToUse : 0)
                .promotionCode(promoCode)
                .build();

        // Luôn lưu vé tạm thời
        onlineTicketRepository.save(ticket);

        // Gửi thông báo và email nếu không phải VNPAY chờ thanh toán
        if (ticket.getIsBanned() == null || !ticket.getIsBanned()) {
            int pointsEarned = 0;
            if ((ticket.getPointsUsed() == null || ticket.getPointsUsed() == 0) && (ticket.getPromotionCode() == null || ticket.getPromotionCode().isEmpty())) {
                pointsEarned = (int) (actualPrice / 20000);
            }
            int memberPointsEarned = memberPointService.award(user, actualPrice);
            if (pointsEarned > 0 || memberPointsEarned > 0) {
                if (pointsEarned > 0) {
                    user.setRewardPoints(
                            (user.getRewardPoints() != null ? user.getRewardPoints() : 0) + pointsEarned);
                }
                userRepository.save(user);
                ticket.setPointsEarned(pointsEarned);
                ticket.setMemberPointsEarned(memberPointsEarned);
                onlineTicketRepository.save(ticket);
            }
            
            String notificationMessage = String.format(
                    "Bạn đã mua thành công vé xem phim trực tuyến **%s**. Mã vé: **%s**. Truy cập mục Vé của tôi để kích hoạt xem phim ngay!",
                    movie.getTitle(), generatedTicketCode);
            String redirectLink = "/my-tickets?ticketCode=" + generatedTicketCode;
            notificationService.sendNotification(user, "Thanh toán vé trực tuyến thành công!", notificationMessage,
                    redirectLink, com.Cinema.movie_backend.entity.NotificationType.TRANSACTION);
            emailService.sendOnlineMovieTicketEmail(user.getEmail(), user.getFullName(), ticket);
        }

        // Vì hiện tại Frontend đang call API mua online nhưng không chọn method nên ta
        // sẽ cho chạy qua VNPAY luôn
        // Hoặc mock tuỳ vào logic Frontend. Ta sẽ mock nếu Frontend không truyền method
        // VNPAY.
        // Tạm thời nếu được gọi qua hàm này, coi như thanh toán thành công (giống trước
        // đây)
        // Nếu muốn thêm VNPAY cho online, cần sửa API/Controller. Nhưng trước mắt giữ
        // theo cách cũ hoặc tích hợp nếu cần.

        if ("VNPAY".equalsIgnoreCase(paymentMethod)) {
            String returnUrl = backendUrl + "/api/payment/vnpay-callback";
            return vnpayService.createPaymentUrl(
                    actualPrice.longValue(),
                    "Thanh toan mua quyen xem phim lo" + ticket.getTicketCode(),
                    returnUrl,
                    ticket.getTicketCode());
        }

        // Trả về chuỗi rỗng để frontend tự động chuyển hướng qua trang Vé Của Tôi
        return "";
    }

    @Transactional
    public void clearAllTickets(String email) {
        User user = userRepository.findByEmailManual(email)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));

        List<OnlineTicket> onlineTickets = onlineTicketRepository.findByUserEmailOrderByPurchaseTimeDesc(email);
        onlineTicketRepository.deleteAll(onlineTickets);

        List<Booking> bookings = bookingRepository.findByUserEmailOrderByBookingTimeDesc(email);
        bookingRepository.deleteAll(bookings);
    }
}
