package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.DTO.RoomRequest;
import com.Cinema.movie_backend.DTO.RoomResponse;
import com.Cinema.movie_backend.DTO.SeatRequest;
import com.Cinema.movie_backend.DTO.SeatResponse;
import com.Cinema.movie_backend.entity.Room;
import com.Cinema.movie_backend.entity.Seat;
import com.Cinema.movie_backend.entity.Theater;
import com.Cinema.movie_backend.enums.RoomType;
import com.Cinema.movie_backend.repository.RoomRepository;
import com.Cinema.movie_backend.repository.SeatRepository;
import com.Cinema.movie_backend.repository.ShowtimeRepository;
import com.Cinema.movie_backend.repository.TheaterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoomService {

        private final RoomRepository roomRepository;
        private final SeatRepository seatRepository;
        private final TheaterRepository theaterRepository;
        private final ShowtimeRepository showtimeRepository;
        private final TicketCancellationService ticketCancellationService;

        @Transactional
        public RoomResponse createRoom(Long theaterId, RoomRequest request) {
                Theater theater = theaterRepository.findById(theaterId)
                                .orElseThrow(() -> new RuntimeException("Không tìm thấy rạp với id: " + theaterId));

                Room room = new Room();
                room.setName(request.getName());
                room.setRoomType(request.getRoomType() != null
                                ? RoomType.valueOf(request.getRoomType())
                                : null);
                room.setCapacity(request.getCapacity());
                room.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);
                room.setMatrixWidth(request.getMatrixWidth());
                room.setMatrixHeight(request.getMatrixHeight());
                room.setEntranceSide(request.getEntranceSide() != null ? request.getEntranceSide() : "LEFT");
                room.setEntranceOffset(request.getEntranceOffset() != null ? request.getEntranceOffset() : 0);
                room.setExitSide(request.getExitSide() != null ? request.getExitSide() : "RIGHT");
                room.setExitOffset(request.getExitOffset() != null ? request.getExitOffset() : 0);
                room.setEntrancePositions(serializeAccessPositions(request.getEntrancePositions(), "LEFT:0"));
                room.setExitPositions(serializeAccessPositions(request.getExitPositions(), "RIGHT:0"));
                room.setMaxSeatsPerUser(request.getMaxSeatsPerUser() != null ? request.getMaxSeatsPerUser() : 0);
                room.setTheater(theater);

                Room savedRoom = roomRepository.save(room);

                if (request.getSeats() != null && !request.getSeats().isEmpty()) {
                        List<Seat> seats = request.getSeats().stream().map(sReq -> {
                                Seat seat = new Seat();
                                seat.setRoom(savedRoom);
                                seat.setRowSymbol(sReq.getRowSymbol());
                                seat.setSeatNumber(sReq.getSeatNumber());
                                seat.setSeatType(sReq.getSeatType());
                                seat.setStatus(sReq.getStatus());
                                seat.setRowIndex(sReq.getRowIndex());
                                seat.setColumnIndex(sReq.getColumnIndex());
                                return seat;
                        }).collect(Collectors.toList());
                        seatRepository.saveAll(seats);
                }

                return mapToRoomResponse(savedRoom, true);
        }

        @Transactional
        public RoomResponse updateRoom(Long roomId, RoomRequest request) {
                Room room = roomRepository.findById(roomId)
                                .orElseThrow(() -> new RuntimeException("Không tìm thấy phòng với id: " + roomId));

                room.setName(request.getName());
                room.setRoomType(request.getRoomType() != null
                                ? RoomType.valueOf(request.getRoomType())
                                : null);
                room.setCapacity(request.getCapacity());
                room.setIsActive(request.getIsActive());
                room.setMatrixWidth(request.getMatrixWidth());
                room.setMatrixHeight(request.getMatrixHeight());
                room.setEntranceSide(request.getEntranceSide() != null ? request.getEntranceSide() : "LEFT");
                room.setEntranceOffset(request.getEntranceOffset() != null ? request.getEntranceOffset() : 0);
                room.setExitSide(request.getExitSide() != null ? request.getExitSide() : "RIGHT");
                room.setExitOffset(request.getExitOffset() != null ? request.getExitOffset() : 0);
                room.setEntrancePositions(serializeAccessPositions(request.getEntrancePositions(), "LEFT:0"));
                room.setExitPositions(serializeAccessPositions(request.getExitPositions(), "RIGHT:0"));
                room.setMaxSeatsPerUser(request.getMaxSeatsPerUser() != null ? request.getMaxSeatsPerUser() : 0);
                Room updatedRoom = roomRepository.save(room);

                // Load existing seats
                List<Seat> oldSeats = seatRepository.findByRoomId(roomId);
                Map<String, Seat> oldSeatMap = oldSeats.stream()
                                .collect(Collectors.toMap(
                                                s -> s.getRowSymbol() + "-" + s.getSeatNumber(),
                                                Function.identity()));

                List<Seat> seatsToSave = new ArrayList<>();
                List<Long> affectedSeatIds = new ArrayList<>();

                if (request.getSeats() != null && !request.getSeats().isEmpty()) {
                        for (SeatRequest sReq : request.getSeats()) {
                                String key = sReq.getRowSymbol() + "-" + sReq.getSeatNumber();
                                Seat existingSeat = oldSeatMap.remove(key); // Bỏ khỏi map để biết ghế nào bị xóa

                                if (existingSeat != null) {
                                        // Update ghế cũ
                                        String oldStatus = existingSeat.getStatus();
                                        existingSeat.setSeatType(sReq.getSeatType());
                                        existingSeat.setStatus(sReq.getStatus());
                                        existingSeat.setRowIndex(sReq.getRowIndex());
                                        existingSeat.setColumnIndex(sReq.getColumnIndex());
                                        seatsToSave.add(existingSeat);

                                        // Nếu trạng thái chuyển thành HỎNG/BẢO TRÌ, nó là ghế bị ảnh hưởng
                                        if ("ACTIVE".equalsIgnoreCase(oldStatus) && !"ACTIVE".equalsIgnoreCase(existingSeat.getStatus())) {
                                                affectedSeatIds.add(existingSeat.getId());
                                        }
                                } else {
                                        // Tạo ghế mới
                                        Seat newSeat = new Seat();
                                        newSeat.setRoom(updatedRoom);
                                        newSeat.setRowSymbol(sReq.getRowSymbol());
                                        newSeat.setSeatNumber(sReq.getSeatNumber());
                                        newSeat.setSeatType(sReq.getSeatType());
                                        newSeat.setStatus(sReq.getStatus());
                                        newSeat.setRowIndex(sReq.getRowIndex());
                                        newSeat.setColumnIndex(sReq.getColumnIndex());
                                        seatsToSave.add(newSeat);
                                }
                        }
                }

                // Các ghế còn sót lại trong oldSeatMap nghĩa là đã bị Admin xóa khỏi sơ đồ
                for (Seat removedSeat : oldSeatMap.values()) {
                        affectedSeatIds.add(removedSeat.getId());
                }

                // Gọi TicketCancellationService để xử lý hoàn tiền, gửi mail, báo chuông
                if (!affectedSeatIds.isEmpty()) {
                        ticketCancellationService.cancelAndRefundBookings(affectedSeatIds);
                }

                // Xóa ghế thừa và lưu ghế mới/update
                if (!oldSeatMap.isEmpty()) {
                        seatRepository.deleteAll(oldSeatMap.values());
                }
                seatRepository.saveAll(seatsToSave);

                return mapToRoomResponse(updatedRoom, true);
        }

        @Transactional
        public RoomResponse toggleRoomStatus(Long roomId) {
                Room room = roomRepository.findById(roomId)
                                .orElseThrow(() -> new RuntimeException("Không tìm thấy phòng chiếu"));
                room.setIsActive(!room.getIsActive());
                Room updated = roomRepository.save(room);
                return mapToRoomResponse(updated, false);
        }

        public RoomResponse getRoomDetails(Long roomId) {
                Room room = roomRepository.findById(roomId)
                                .orElseThrow(() -> new RuntimeException("Không tìm thấy phòng chiếu"));
                return mapToRoomResponse(room, true);
        }

        public List<RoomResponse> getRoomsByTheater(Long theaterId) {
                List<Room> rooms = roomRepository.findByTheaterId(theaterId);
                return rooms.stream()
                                .map(r -> mapToRoomResponse(r, false)) // Do not fetch all seats for list view to save
                                                                       // memory
                                .collect(Collectors.toList());
        }

        private RoomResponse mapToRoomResponse(Room room, boolean includeSeats) {
                List<SeatResponse> seatResponses = null;
                if (includeSeats) {
                        List<Seat> seats = seatRepository.findByRoomId(room.getId());
                        seatResponses = seats.stream().map(s -> SeatResponse.builder()
                                        .id(s.getId())
                                        .rowSymbol(s.getRowSymbol())
                                        .seatNumber(s.getSeatNumber())
                                        .seatType(s.getSeatType())
                                        .status(s.getStatus())
                                        .rowIndex(s.getRowIndex())
                                        .columnIndex(s.getColumnIndex())
                                        .build()).collect(Collectors.toList());
                }

                return RoomResponse.builder()
                                .id(room.getId())
                                .name(room.getName())
                                .roomType(room.getRoomType() != null ? room.getRoomType().name() : null)
                                .capacity(room.getCapacity())
                                .isActive(room.getIsActive())
                                .matrixWidth(room.getMatrixWidth())
                                .matrixHeight(room.getMatrixHeight())
                                .entranceSide(room.getEntranceSide())
                                .entranceOffset(room.getEntranceOffset())
                                .exitSide(room.getExitSide())
                                .exitOffset(room.getExitOffset())
                                .entrancePositions(parseAccessPositions(room.getEntrancePositions(), "LEFT:0"))
                                .exitPositions(parseAccessPositions(room.getExitPositions(), "RIGHT:0"))
                                .maxSeatsPerUser(room.getMaxSeatsPerUser())
                                .theaterId(room.getTheater() != null ? room.getTheater().getId() : null)
                                .seats(seatResponses)
                                .build();
        }

        private String serializeAccessPositions(List<String> positions, String fallback) {
                if (positions == null || positions.isEmpty()) return fallback;
                return positions.stream()
                                .filter(position -> position != null && position.matches("^(TOP|BOTTOM|LEFT|RIGHT):\\d+$"))
                                .distinct()
                                .collect(Collectors.joining(","));
        }

        private List<String> parseAccessPositions(String positions, String fallback) {
                String value = positions == null || positions.isBlank() ? fallback : positions;
                return List.of(value.split(","));
        }
}
