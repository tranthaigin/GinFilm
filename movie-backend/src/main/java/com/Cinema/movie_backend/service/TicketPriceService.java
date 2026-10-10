package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.DTO.TicketPriceRequest;
import com.Cinema.movie_backend.DTO.TicketPriceResponse;
import com.Cinema.movie_backend.entity.TicketPrice;
import com.Cinema.movie_backend.enums.AudienceType;
import com.Cinema.movie_backend.enums.DayType;
import com.Cinema.movie_backend.enums.RoomType;
import com.Cinema.movie_backend.enums.SeatType;
import com.Cinema.movie_backend.enums.TicketPriceStatus;
import com.Cinema.movie_backend.repository.TicketPriceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TicketPriceService {

    private final TicketPriceRepository ticketPriceRepository;

    // ────────────────────────────────────────────────
    // READ
    // ────────────────────────────────────────────────

    /** Lấy toàn bộ danh sách giá vé (cho admin). */
    public List<TicketPriceResponse> getAllTicketPrices() {
        return ticketPriceRepository.findAllByOrderByAudienceTypeAscSeatTypeAscRoomTypeAscDayTypeAsc()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /** Lấy danh sách giá vé đang hoạt động (public). */
    public List<TicketPriceResponse> getActiveTicketPrices() {
        return ticketPriceRepository.findByStatusOrderByAudienceTypeAscSeatTypeAscRoomTypeAscDayTypeAsc(TicketPriceStatus.ACTIVE)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /** Lấy chi tiết một giá vé theo ID. */
    public TicketPriceResponse getById(Long id) {
        TicketPrice tp = findOrThrow(id);
        return toResponse(tp);
    }

    /**
     * Tra cứu giá vé khi đặt vé (public / booking flow).
     * Trả về Optional.empty() nếu không có giá phù hợp.
     */
    public Optional<TicketPriceResponse> lookupPrice(
            AudienceType audienceType,
            SeatType seatType,
            RoomType roomType,
            DayType dayType) {
        return ticketPriceRepository
                .findActivePrice(audienceType, seatType, roomType, dayType, LocalDate.now())
                .map(this::toResponse);
    }

    // ────────────────────────────────────────────────
    // CREATE
    // ────────────────────────────────────────────────

    @Transactional
    public TicketPriceResponse createTicketPrice(TicketPriceRequest request) {
        validateNoDuplicate(
                request.getAudienceType(),
                request.getSeatType(),
                request.getRoomType(),
                request.getDayType(),
                null
        );

        TicketPrice tp = TicketPrice.builder()
                .audienceType(request.getAudienceType())
                .seatType(request.getSeatType())
                .roomType(request.getRoomType())
                .dayType(request.getDayType())
                .price(request.getPrice())
                .effectiveFrom(request.getEffectiveFrom())
                .effectiveTo(request.getEffectiveTo())
                .status(request.getStatus() != null ? request.getStatus() : TicketPriceStatus.ACTIVE)
                .build();

        return toResponse(ticketPriceRepository.save(tp));
    }

    // ────────────────────────────────────────────────
    // UPDATE
    // ────────────────────────────────────────────────

    @Transactional
    public TicketPriceResponse updateTicketPrice(Long id, TicketPriceRequest request) {
        TicketPrice tp = findOrThrow(id);

        validateNoDuplicate(
                request.getAudienceType(),
                request.getSeatType(),
                request.getRoomType(),
                request.getDayType(),
                id
        );

        tp.setAudienceType(request.getAudienceType());
        tp.setSeatType(request.getSeatType());
        tp.setRoomType(request.getRoomType());
        tp.setDayType(request.getDayType());
        tp.setPrice(request.getPrice());
        tp.setEffectiveFrom(request.getEffectiveFrom());
        tp.setEffectiveTo(request.getEffectiveTo());
        if (request.getStatus() != null) {
            tp.setStatus(request.getStatus());
        }

        return toResponse(ticketPriceRepository.save(tp));
    }

    // ────────────────────────────────────────────────
    // STATUS ACTIONS
    // ────────────────────────────────────────────────

    /** Thay đổi trạng thái (ACTIVE / INACTIVE / HIDDEN). */
    @Transactional
    public TicketPriceResponse changeStatus(Long id, TicketPriceStatus newStatus) {
        TicketPrice tp = findOrThrow(id);
        tp.setStatus(newStatus);
        return toResponse(ticketPriceRepository.save(tp));
    }

    // ────────────────────────────────────────────────
    // DELETE
    // ────────────────────────────────────────────────

    @Transactional
    public void deleteTicketPrice(Long id) {
        TicketPrice tp = findOrThrow(id);
        ticketPriceRepository.delete(tp);
    }

    // ────────────────────────────────────────────────
    // HELPERS
    // ────────────────────────────────────────────────

    private TicketPrice findOrThrow(Long id) {
        return ticketPriceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy giá vé với id: " + id));
    }

    /**
     * Kiểm tra trùng combo 4 tiêu chí.
     * excludeId = null khi tạo mới, = id khi cập nhật.
     */
    private void validateNoDuplicate(
            AudienceType audienceType,
            SeatType seatType,
            RoomType roomType,
            DayType dayType,
            Long excludeId) {

        boolean isDuplicate = (excludeId == null)
                ? ticketPriceRepository.existsByAudienceTypeAndSeatTypeAndRoomTypeAndDayType(
                        audienceType, seatType, roomType, dayType)
                : ticketPriceRepository.existsByAudienceTypeAndSeatTypeAndRoomTypeAndDayTypeAndIdNot(
                        audienceType, seatType, roomType, dayType, excludeId);

        if (isDuplicate) {
            throw new RuntimeException(
                    String.format("Đã tồn tại giá vé cho tổ hợp: %s / %s / %s / %s",
                            audienceType, seatType, roomType, dayType));
        }
    }

    private TicketPriceResponse toResponse(TicketPrice tp) {
        return TicketPriceResponse.builder()
                .id(tp.getId())
                .audienceType(tp.getAudienceType())
                .seatType(tp.getSeatType())
                .roomType(tp.getRoomType())
                .dayType(tp.getDayType())
                .price(tp.getPrice())
                .effectiveFrom(tp.getEffectiveFrom())
                .effectiveTo(tp.getEffectiveTo())
                .status(tp.getStatus())
                .createdAt(tp.getCreatedAt())
                .updatedAt(tp.getUpdatedAt())
                .build();
    }
}
