package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.entity.*;
import com.Cinema.movie_backend.enums.*;
import com.Cinema.movie_backend.repository.*;
import com.Cinema.movie_backend.DTO.*;
import org.junit.jupiter.api.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class BookingRepairServiceTest {
    BookingService service;
    BookingRepository bookings;
    UserRepository users;
    OnlineTicketRepository online;
    User owner;
    Booking booking;
    @BeforeEach void setup() throws Exception {
        var constructor = BookingService.class.getConstructors()[0];
        service = (BookingService) constructor.newInstance(Arrays.stream(constructor.getParameterTypes()).map(t -> mock(t)).toArray());
        bookings = (BookingRepository) ReflectionTestUtils.getField(service, "bookingRepository");
        users = (UserRepository) ReflectionTestUtils.getField(service, "userRepository");
        online = (OnlineTicketRepository) ReflectionTestUtils.getField(service, "onlineTicketRepository");
        owner = new User(); owner.setId(UUID.randomUUID()); owner.setEmail("owner@example.com");
        booking = Booking.builder().id(42L).user(owner).status(BookingStatus.PENDING).expireAt(LocalDateTime.now().plusMinutes(5))
                .bookingCombos(new ArrayList<>()).build();
        when(bookings.findLockedById(42L)).thenReturn(Optional.of(booking));
        when(bookings.save(any())).thenAnswer(inv -> inv.getArgument(0));
        login(owner.getEmail());
    }
    void login(String email) { SecurityContextHolder.getContext().setAuthentication(UsernamePasswordAuthenticationToken.authenticated(email, null, List.of(new SimpleGrantedAuthority("USER")))); }
    @AfterEach void clear() { SecurityContextHolder.clearContext(); }
    @Test void otherAccountCannotChangeCombo() {
        login("other@example.com"); UpdateComboRequest request = new UpdateComboRequest(); request.setCombos(List.of());
        assertThrows(org.springframework.security.access.AccessDeniedException.class, () -> service.updateCombo(42L, request));
    }
    @Test void brokenSeatCannotBeHeld() {
        var showtimes = (ShowtimeRepository) ReflectionTestUtils.getField(service, "showtimeRepository");
        var seats = (SeatRepository) ReflectionTestUtils.getField(service, "seatRepository");
        Room room = new Room(); room.setId(1L);
        Showtime showtime = new Showtime(); showtime.setId(10L); showtime.setRoom(room); showtime.setShowDate(java.time.LocalDate.now().plusDays(1));
        Seat seat = new Seat(); seat.setId(5L); seat.setRoom(room); seat.setStatus("BROKEN");
        when(showtimes.findById(10L)).thenReturn(Optional.of(showtime));
        when(seats.findById(5L)).thenReturn(Optional.of(seat));
        when(users.findByEmailManual(owner.getEmail())).thenReturn(Optional.of(owner));
        HoldSeatRequest request = new HoldSeatRequest(); request.setShowtimeId(10L); request.setSeatIds(List.of(5L));
        assertThrows(IllegalArgumentException.class, () -> service.holdSeats(request, owner.getEmail()));
        verify((TicketRepository) ReflectionTestUtils.getField(service, "ticketRepository"), never()).saveAll(any());
    }
    @Test void negativeComboQuantityRejected() {
        ComboItemRequest item = new ComboItemRequest(); item.setQuantity(-2); item.setComboId(UUID.randomUUID());
        UpdateComboRequest request = new UpdateComboRequest(); request.setCombos(List.of(item));
        assertThrows(IllegalArgumentException.class, () -> service.updateCombo(42L, request));
    }
    @Test void otherAccountCannotCreatePayment() {
        login("other@example.com"); assertThrows(org.springframework.security.access.AccessDeniedException.class, () -> service.createPayment(42L, new PaymentRequest()));
    }
    @Test void cashCannotBypassOnlinePayment() {
        PaymentRequest request = new PaymentRequest(); request.setPaymentMethod(PaymentMethod.CASH);
        assertThrows(IllegalArgumentException.class, () -> service.createPayment(42L, request));
    }
    @Test void posPaymentStatusUsesPersistedProviderConfirmation() {
        var payments = (PaymentRepository) ReflectionTestUtils.getField(service, "paymentRepository");
        when(bookings.findById(42L)).thenReturn(Optional.of(booking));
        Payment payment = Payment.builder().status(PaymentStatus.PENDING).build();
        when(payments.findByBookingId(42L)).thenReturn(Optional.of(payment));
        assertEquals("PENDING", service.getPosPaymentStatus(42L).get("paymentStatus"));
        booking.setStatus(BookingStatus.COMPLETED); payment.setStatus(PaymentStatus.SUCCESS);
        assertEquals("SUCCESS", service.getPosPaymentStatus(42L).get("paymentStatus"));
    }
    @Test void anotherAccountCannotReadPosPaymentStatus() {
        when(bookings.findById(42L)).thenReturn(Optional.of(booking)); login("other@example.com");
        assertThrows(org.springframework.security.access.AccessDeniedException.class, () -> service.getPosPaymentStatus(42L));
    }
    @Test void comboCannotBeAddedAfterPaymentAmountWasPrepared() {
        var payments = (PaymentRepository) ReflectionTestUtils.getField(service, "paymentRepository");
        when(payments.findByBookingId(42L)).thenReturn(Optional.of(new Payment()));
        UpdateComboRequest request = new UpdateComboRequest(); request.setCombos(List.of());
        assertThrows(IllegalArgumentException.class, () -> service.updateCombo(42L, request));
        verify(bookings, never()).flush();
    }
    @Test void repeatedPaymentReusesExistingTransactionWithoutDeductingPointsAgain() {
        var payments = (PaymentRepository) ReflectionTestUtils.getField(service, "paymentRepository");
        var vnpay = (VnpayService) ReflectionTestUtils.getField(service, "vnpayService");
        Payment payment = Payment.builder().status(PaymentStatus.PENDING).method(PaymentMethod.VNPAY).amount(45000.0).transactionNo("TK-existing").build();
        when(payments.findByBookingId(42L)).thenReturn(Optional.of(payment));
        when(vnpay.createPaymentUrl(eq(45000L), anyString(), anyString(), eq("TK-existing"))).thenReturn("https://payment.example.com");
        owner.setRewardPoints(5); booking.setPointsUsed(10);
        PaymentRequest request = new PaymentRequest(); request.setPaymentMethod(PaymentMethod.VNPAY); request.setPointsToUse(10);
        assertEquals("https://payment.example.com", service.createPayment(42L, request));
        assertEquals(5, owner.getRewardPoints()); verify(payments, never()).delete(any()); verify(payments, never()).save(any());
    }
    @Test void pendingTransactionCannotBeReplacedWithDifferentMethod() {
        var payments = (PaymentRepository) ReflectionTestUtils.getField(service, "paymentRepository");
        when(payments.findByBookingId(42L)).thenReturn(Optional.of(Payment.builder().status(PaymentStatus.PENDING).method(PaymentMethod.VNPAY).build()));
        PaymentRequest request = new PaymentRequest(); request.setPaymentMethod(PaymentMethod.STRIPE);
        assertThrows(IllegalArgumentException.class, () -> service.createPayment(42L, request)); verify(payments, never()).delete(any());
    }
    @Test void onlinePriceComesFromServerAndTicketRemainsPending() {
        Movie movie = new Movie(); movie.setId(1L); movie.setIsOnlineAvailable(true); movie.setDuration(120);
        var movies = (MovieRepository) ReflectionTestUtils.getField(service, "movieRepository");
        var prices = (OnlineMoviePriceRepository) ReflectionTestUtils.getField(service, "onlineMoviePriceRepository");
        when(users.findByEmailManual(owner.getEmail())).thenReturn(Optional.of(owner)); when(movies.findById(1L)).thenReturn(Optional.of(movie));
        when(prices.findByMovieId(1L)).thenReturn(Optional.of(OnlineMoviePrice.builder().basePrice(new BigDecimal("45000")).build()));
        service.purchaseOnlineTicket(1L, owner.getEmail(), 1.0, "VNPAY", 0, null);
        var capture = org.mockito.ArgumentCaptor.forClass(OnlineTicket.class); verify(online).save(capture.capture());
        assertEquals(45000.0, capture.getValue().getPrice()); assertTrue(capture.getValue().getIsBanned());
        assertEquals(PaymentStatus.PENDING, capture.getValue().getPaymentStatus());
    }
    @Test void pinFailuresCommitCountersButActivationFailuresStillRollBack() {
        var method = Arrays.stream(OnlineTicketActivationService.class.getMethods()).filter(m -> m.getName().equals("activateOrWatchTicket")).findFirst().orElseThrow();
        var transaction = new org.springframework.transaction.annotation.AnnotationTransactionAttributeSource().getTransactionAttribute(method, OnlineTicketActivationService.class);
        assertNotNull(transaction);
        assertFalse(transaction.rollbackOn(new com.Cinema.movie_backend.exception.InvalidPinException("bad pin")));
        assertTrue(transaction.rollbackOn(new IllegalArgumentException("activation failure")));
    }
    @Test void passwordNotIncludedInJson() throws Exception {
        owner.setPassword("FAKE_HASH"); String json = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(owner);
        assertFalse(json.contains("FAKE_HASH")); assertFalse(json.contains("\"password\""));
    }
}
