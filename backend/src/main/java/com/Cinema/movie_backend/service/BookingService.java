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
    @Autowired private StripeGateway stripeGateway;
    @Autowired private AccountTransactionService accountTransactions;
    @Autowired private AfterCommitService deliveries;

    @org.springframework.beans.factory.annotation.Value("${app.backend.url:http://localhost:8080}")
    private String backendUrl;

    @Transactional
    public Booking holdSeats(HoldSeatRequest request, String email) {
        if (request.getSeatIds() == null || request.getSeatIds().isEmpty()
                || new java.util.HashSet<>(request.getSeatIds()).size() != request.getSeatIds().size()) throw new IllegalArgumentException("Invalid seat selection");
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

            if (seat.getRoom() == null || !seat.getRoom().getId().equals(showtime.getRoom().getId())) throw new IllegalArgumentException("Seat does not belong to the showtime room");
            if (!"ACTIVE".equalsIgnoreCase(seat.getStatus())) throw new IllegalArgumentException("Ghế đã ngừng sử dụng hoặc bị hỏng");
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
        Booking booking = bookingRepository.findLockedById(bookingId)
                .orElseThrow(() -> new RuntimeException("Đơn hàng không tồn tại"));

        requireBookingOperator(booking);
        if (booking.getExpireAt() != null && !booking.getExpireAt().isAfter(LocalDateTime.now())) throw new IllegalArgumentException("Booking expired");
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new RuntimeException("Chỉ có thể cập nhật combo cho đơn hàng đang chờ.");
        }
        if (paymentRepository.findByBookingId(bookingId).isPresent()) {
            throw new IllegalArgumentException("Đơn đã tạo giao dịch thanh toán, không thể thay đổi combo.");
        }

        if (request.getCombos() == null) throw new IllegalArgumentException("Combos required");
        // Xóa combo cũ nếu có
        if (booking.getBookingCombos() != null) {
            booking.getBookingCombos().clear();
            bookingRepository.flush();
        }

        double comboTotal = 0.0;
        List<BookingCombo> bookingCombos = new ArrayList<>();

        for (ComboItemRequest item : request.getCombos()) {
            if (item.getQuantity() == null || item.getQuantity() <= 0 || item.getQuantity() > 99) throw new IllegalArgumentException("Combo quantity must be between 1 and 99");
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

        if (booking.getBookingCombos() == null) booking.setBookingCombos(new ArrayList<>());
        booking.getBookingCombos().addAll(bookingCombos);

        // Tính lại tổng tiền (giá vé + combo)
        double ticketTotal = ticketRepository.findByBookingId(bookingId).stream()
                .mapToDouble(Ticket::getPrice)
                .sum();

        booking.setTotalAmount(ticketTotal + comboTotal);
        return bookingRepository.save(booking);
    }

    @Transactional
    public Booking holdSeatsPos(HoldSeatRequest request, UUID customerId) {
        if (request.getSeatIds() == null || request.getSeatIds().isEmpty()
                || new java.util.HashSet<>(request.getSeatIds()).size() != request.getSeatIds().size()) throw new IllegalArgumentException("Invalid seat selection");
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

            if (seat.getRoom() == null || !seat.getRoom().getId().equals(showtime.getRoom().getId())) throw new IllegalArgumentException("Seat does not belong to the showtime room");
            if (!"ACTIVE".equalsIgnoreCase(seat.getStatus())) throw new IllegalArgumentException("Ghế đã ngừng sử dụng hoặc bị hỏng");
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

    private void requireBookingOperator(Booking booking) {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        boolean staff = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("STAFF") || a.getAuthority().equals("ADMIN"));
        if (auth == null || !auth.isAuthenticated() || (!staff && !booking.getUser().getEmail().equals(auth.getName()))) {
            throw new org.springframework.security.access.AccessDeniedException("Booking belongs to another account");
        }
    }

    @Transactional
    public Booking updateComboPos(Long bookingId, UpdateComboRequest request) {
        return updateCombo(bookingId, request);
    }

    @Transactional
    public String createPayment(Long bookingId, com.Cinema.movie_backend.DTO.PaymentRequest request) {
        Booking booking = bookingRepository.findLockedById(bookingId)
                .orElseThrow(() -> new RuntimeException("Đơn hàng không tồn tại"));

        requireBookingOperator(booking);
        if (booking.getExpireAt() != null && !booking.getExpireAt().isAfter(LocalDateTime.now())) throw new IllegalArgumentException("Booking expired");
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new RuntimeException("Đơn hàng không ở trạng thái hợp lệ để thanh toán.");
        }

        PaymentMethod method = request.getPaymentMethod();
        if (method != PaymentMethod.VNPAY && method != PaymentMethod.STRIPE) throw new IllegalArgumentException("Unsupported online payment method");
        var previous = paymentRepository.findByBookingId(bookingId);
        if (previous.isPresent()) {
            Payment payment = previous.get();
            String currentPromo = booking.getPromotion() == null ? "" : booking.getPromotion().getCode();
            String requestedPromo = request.getPromoCode() == null ? "" : request.getPromoCode().trim();
            int used = booking.getPointsUsed() == null ? 0 : booking.getPointsUsed();
            int requestedPoints = request.getPointsToUse() == null ? 0 : request.getPointsToUse();
            if (payment.getStatus() != PaymentStatus.PENDING || payment.getMethod() != method
                    || used != requestedPoints || !currentPromo.equalsIgnoreCase(requestedPromo)) {
                throw new IllegalArgumentException("Đơn đã tạo giao dịch; hãy hoàn tất giao dịch hiện tại hoặc chờ đơn hết hạn.");
            }
            if (method == PaymentMethod.STRIPE) return stripeGateway.retrieve(payment.getTransactionNo()).getClientSecret();
            return vnpayService.createPaymentUrl(payment.getAmount().longValue(), "Thanh toan ve TK" + bookingId,
                    backendUrl + "/api/payment/vnpay-callback", payment.getTransactionNo());
        }
        if (accountTransactions != null) accountTransactions.reserve(booking.getUser());
        if (booking.getPointsUsed() != null && booking.getPointsUsed() > 0) {
            User owner = booking.getUser();
            owner.setRewardPoints((owner.getRewardPoints() == null ? 0 : owner.getRewardPoints()) + booking.getPointsUsed());
            booking.setPointsUsed(0);
        }

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
        if (pointsToUse != null && pointsToUse < 0) throw new IllegalArgumentException("Invalid points");
        int actualPointsToUse = 0;
        if (pointsToUse != null && pointsToUse > 0) {
            if (booking.getPromotion() != null && booking.getPromotion().getScope() != com.Cinema.movie_backend.enums.PromotionScope.COMBO_ONLY) {
                throw new IllegalArgumentException("Điểm thưởng không thể dùng cùng khuyến mãi giảm giá vé");
            }
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

        if (!Double.isFinite(finalTotalAmount) || finalTotalAmount <= 0 || finalTotalAmount != Math.rint(finalTotalAmount)) throw new IllegalArgumentException("Invalid payment amount");
        booking.setTotalAmount(finalTotalAmount);
        bookingRepository.save(booking);

        String ticketCode = "UNKNOWN";
        if (booking.getTickets() != null && !booking.getTickets().isEmpty()) {
            ticketCode = booking.getTickets().get(0).getTicketCode().split("-")[0];
        }

        booking.setPaymentMethod(method);
        String transactionNo = "TK-" + UUID.randomUUID(); // Use ticketCode instead of UUID for consistent invoice numbers

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

            String orderInfo = "Thanh toan ve xem phim GinFilm";
            String returnUrl = backendUrl + "/api/payment/vnpay-callback";

            return vnpayService.createPaymentUrl((long) finalTotalAmount, orderInfo, returnUrl,
                    transactionNo);
        }

        var intent = stripeGateway.create((long) finalTotalAmount, "booking:" + bookingId, booking.getUser().getEmail());
        paymentRepository.save(Payment.builder().booking(booking).amount(finalTotalAmount)
                .paymentTime(LocalDateTime.now()).status(PaymentStatus.PENDING).method(PaymentMethod.STRIPE)
                .transactionNo(intent.getId()).build());
        return intent.getClientSecret();
    }

    @Transactional
    public java.util.Map<String, Object> processPaymentPos(Long bookingId, java.util.Map<String, Object> request) {
        Booking booking = bookingRepository.findLockedById(bookingId)
                .orElseThrow(() -> new RuntimeException("Đơn hàng không tồn tại"));
        requireBookingOperator(booking);
        if (booking.getExpireAt() == null || !booking.getExpireAt().isAfter(LocalDateTime.now())) throw new IllegalArgumentException("Booking expired");

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new RuntimeException("Đơn hàng không ở trạng thái hợp lệ để thanh toán.");
        }

        String paymentMethodStr = (String) request.getOrDefault("paymentMethod", "CASH");
        PaymentMethod method = PaymentMethod.valueOf(paymentMethodStr);
        if (method != PaymentMethod.CASH && method != PaymentMethod.VNPAY) throw new IllegalArgumentException("POS supports CASH or VNPAY");

        // Fetch ticket code manually because it's @Transient
        String ticketCode = "UNKNOWN";
        List<Ticket> tickets = ticketRepository.findByBookingId(bookingId);
        if (!tickets.isEmpty() && tickets.get(0).getTicketCode() != null) {
            ticketCode = tickets.get(0).getTicketCode().split("-")[0];
        }
        var previous = paymentRepository.findByBookingId(bookingId);
        if (previous.isPresent()) {
            Payment payment = previous.get();
            if (method != PaymentMethod.VNPAY || payment.getMethod() != method || payment.getStatus() != PaymentStatus.PENDING) {
                throw new IllegalArgumentException("Đơn đã có giao dịch thanh toán.");
            }
            String url = vnpayService.createPaymentUrl(payment.getAmount().longValue(), "Thanh toan POS " + ticketCode,
                    backendUrl + "/api/payment/vnpay-callback", payment.getTransactionNo());
            return java.util.Map.of("message", "Redirect to VNPAY", "paymentUrl", url, "ticketCode", ticketCode);
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
            Booking completedBooking = booking;
            Runnable receipt = () -> {
                notificationService.sendNotification(completedBooking.getUser(), "Thanh toán vé xem phim thành công!",
                        notificationMessage, redirectLink, NotificationType.TRANSACTION);
                emailService.sendCinemaTicketEmail(completedBooking.getUser().getEmail(), completedBooking.getUser().getFullName(), completedBooking,
                        tickets);
            };
            if (deliveries != null) deliveries.submit(receipt);
            else { try { receipt.run(); } catch (RuntimeException ignored) { /* Payment remains successful if receipt delivery fails. */ } }
        }

        return java.util.Map.of(
                "message", "Payment processed successfully",
                "bookingId", booking.getId(),
                "amount", booking.getTotalAmount(),
                "ticketCode", ticketCode);
    }

    @Transactional(readOnly = true)
    public java.util.Map<String, Object> getPosPaymentStatus(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId).orElseThrow(() -> new IllegalArgumentException("Đơn hàng không tồn tại"));
        requireBookingOperator(booking);
        var payment = paymentRepository.findByBookingId(bookingId);
        return java.util.Map.of("bookingStatus", booking.getStatus().name(),
                "paymentStatus", payment.map(value -> value.getStatus().name()).orElse("PENDING"),
                "ticketCode", booking.getTicketCode() == null ? "" : booking.getTicketCode(),
                "amount", booking.getTotalAmount() == null ? 0.0 : booking.getTotalAmount());
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
        if (!"VNPAY".equalsIgnoreCase(paymentMethod) && !"STRIPE".equalsIgnoreCase(paymentMethod)) throw new IllegalArgumentException("Unsupported online payment method");
        if (pointsToUse != null && pointsToUse < 0) throw new IllegalArgumentException("Invalid points");
        User user = userRepository.findByEmailManual(email)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));
        if (accountTransactions != null) accountTransactions.reserve(user);

        Movie movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new RuntimeException("Phim không tồn tại"));

        if (movie.getIsOnlineAvailable() == null || !movie.getIsOnlineAvailable()) {
            throw new RuntimeException("Phim này không hỗ trợ xem trực tuyến");
        }

        int defaultBuffer = systemConfigService.getDefaultVodBufferMinutes();
        int movieDuration = (movie.getDuration() != null && movie.getDuration() > 0) ? movie.getDuration() : 120;
        Integer validityMins = movieDuration + defaultBuffer;

        OnlineMoviePrice pricing = onlineMoviePriceRepository.findByMovieId(movieId)
                .orElseThrow(() -> new IllegalArgumentException("Chưa cấu hình giá vé online"));
        double actualPrice = pricing.getBasePrice().doubleValue();
        LocalDateTime now = LocalDateTime.now();
        if (pricing.getDiscountPercentage() != null && pricing.getDiscountPercentage() > 0
                && (pricing.getPromoStartDate() == null || !now.isBefore(pricing.getPromoStartDate()))
                && (pricing.getPromoEndDate() == null || !now.isAfter(pricing.getPromoEndDate()))) {
            int discount = pricing.getDiscountPercentage();
            if (discount > 100) throw new IllegalArgumentException("Giảm giá cấu hình không hợp lệ");
            actualPrice = Math.round(actualPrice * (100 - discount) / 100.0);
        }
        if (promoCode != null && !promoCode.isBlank()) {
            actualPrice = Math.max(0, actualPrice - promotionService.applyPromotion(promoCode, actualPrice, 0.0, user.getId()));
        }
        if (pointsToUse != null && pointsToUse > 0) {
            if (promoCode != null && !promoCode.isBlank()) throw new IllegalArgumentException("Điểm thưởng không thể dùng cùng khuyến mãi giảm giá vé");
            int max = (int) (Math.max(0, actualPrice - systemConfigService.getMinCashVnd()) / 1000);
            if (pointsToUse < systemConfigService.getMinRlfPoints() || pointsToUse > max
                    || user.getRewardPoints() == null || pointsToUse > user.getRewardPoints()) {
                throw new IllegalArgumentException("Số điểm sử dụng không hợp lệ");
            }
            actualPrice -= pointsToUse * 1000.0;
            user.setRewardPoints(user.getRewardPoints() - pointsToUse);
            userRepository.save(user);
        }
        if (!Double.isFinite(actualPrice) || actualPrice <= 0 || actualPrice != Math.rint(actualPrice)) {
            throw new IllegalArgumentException("Giá vé online không hợp lệ");
        }
        OnlineTicket ticket = OnlineTicket.builder().user(user).movie(movie).purchaseTime(now)
                .price(actualPrice).ticketCode("WEB-" + UUID.randomUUID().toString().toUpperCase())
                .timeLimitMinutes(validityMins).isBanned(true).paymentStatus(PaymentStatus.PENDING)
                .paymentMethod(PaymentMethod.valueOf(paymentMethod.toUpperCase()))
                .pointsUsed(pointsToUse == null ? 0 : pointsToUse).promotionCode(promoCode).build();
        onlineTicketRepository.save(ticket);

        if ("VNPAY".equalsIgnoreCase(paymentMethod)) {
            String returnUrl = backendUrl + "/api/payment/vnpay-callback";
            return vnpayService.createPaymentUrl(
                    (long) actualPrice,
                    "Thanh toan mua quyen xem phim lo" + ticket.getTicketCode(),
                    returnUrl,
                    ticket.getTicketCode());
        }

        var intent = stripeGateway.create((long) actualPrice, "online:" + ticket.getTicketCode(), email);
        ticket.setProviderReference(intent.getId());
        onlineTicketRepository.save(ticket);
        return intent.getClientSecret();
    }

    @Transactional
    public void clearAllTickets(String email) {
        throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.CONFLICT, "Không thể xóa lịch sử giao dịch thanh toán.");
    }
}
