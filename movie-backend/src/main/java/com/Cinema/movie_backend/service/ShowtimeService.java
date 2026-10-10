package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.DTO.MovieShowtimeDto;
import com.Cinema.movie_backend.DTO.TheaterShowtimesResponse;
import com.Cinema.movie_backend.DTO.ShowtimeSeatResponse;
import com.Cinema.movie_backend.DTO.SeatResponse;
import com.Cinema.movie_backend.DTO.ShowtimeUpdateRequest;
import com.Cinema.movie_backend.entity.Genre;
import com.Cinema.movie_backend.entity.Movie;
import com.Cinema.movie_backend.entity.Seat;
import com.Cinema.movie_backend.entity.Showtime;
import com.Cinema.movie_backend.entity.Theater;
import com.Cinema.movie_backend.DTO.ShowtimeCreateRequest;
import com.Cinema.movie_backend.DTO.AdminShowtimeDto;
import com.Cinema.movie_backend.repository.MovieRepository;
import com.Cinema.movie_backend.repository.RoomRepository;
import com.Cinema.movie_backend.repository.SeatRepository;
import com.Cinema.movie_backend.repository.TheaterRepository;
import com.Cinema.movie_backend.repository.ShowtimeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;
import com.Cinema.movie_backend.enums.AudienceType;
import com.Cinema.movie_backend.enums.DayType;
import com.Cinema.movie_backend.enums.RoomType;
import com.Cinema.movie_backend.enums.SeatType;
import com.Cinema.movie_backend.entity.TicketPrice;

@Service
@RequiredArgsConstructor
public class ShowtimeService {

        private final ShowtimeRepository showtimeRepository;
        private final MovieRepository movieRepository;
        private final TheaterRepository theaterRepository;
        private final RoomRepository roomRepository;
        private final SeatRepository seatRepository;
        private final com.Cinema.movie_backend.repository.TicketRepository ticketRepository;
        private final com.Cinema.movie_backend.repository.BookingRepository bookingRepository;
        private final com.Cinema.movie_backend.repository.TicketPriceRepository ticketPriceRepository;

        public List<MovieShowtimeDto> getShowtimesByTheaterAndDate(Long theaterId, LocalDate date) {
                List<Showtime> showtimes = showtimeRepository.findByTheaterIdAndShowDateOrderByStartTimeAsc(theaterId,
                                date);

                if (date != null) {
                        if (date.isBefore(LocalDate.now())) {
                                showtimes = new ArrayList<>();
                        } else if (date.equals(LocalDate.now())) {
                                java.time.LocalTime now = java.time.LocalTime.now();
                                showtimes = showtimes.stream()
                                                .filter(s -> s.getStartTime().isAfter(now))
                                                .collect(Collectors.toList());
                        }
                }

                return buildMovieShowtimeDtoList(showtimes);
        }

        /**
         * Dành cho POS (bán vé tại quầy):
         * - Ngày trong quá khứ: không trả về suất nào
         * - Hôm nay: trả về suất chưa chiếu VÀ suất vừa bắt đầu chưa quá 5 phút
         * - Ngày tương lai: trả về tất cả suất
         */
        public List<MovieShowtimeDto> getShowtimesByTheaterAndDateForPos(Long theaterId, LocalDate date) {
                List<Showtime> showtimes = showtimeRepository.findByTheaterIdAndShowDateOrderByStartTimeAsc(theaterId,
                                date);

                if (date != null) {
                        if (date.isBefore(LocalDate.now())) {
                                showtimes = new ArrayList<>();
                        } else if (date.equals(LocalDate.now())) {
                                java.time.LocalTime now = java.time.LocalTime.now();
                                java.time.LocalTime cutoff = now.minusMinutes(5);
                                showtimes = showtimes.stream()
                                                // Giữ lại: suất chưa chiếu HOẶC suất đã bắt đầu nhưng chưa quá 5 phút
                                                .filter(s -> s.getStartTime().isAfter(cutoff))
                                                .collect(Collectors.toList());
                        }
                }

                return buildMovieShowtimeDtoList(showtimes);
        }

        private List<MovieShowtimeDto> buildMovieShowtimeDtoList(List<Showtime> showtimes) {
                // Group by Movie ID to avoid LazyInitializationException from Lombok's hashCode on Movie
                Map<Long, List<Showtime>> showtimesByMovieId = showtimes.stream()
                                .collect(Collectors.groupingBy(s -> s.getMovie().getId(), LinkedHashMap::new,
                                                Collectors.toList()));

                List<MovieShowtimeDto> result = new ArrayList<>();

                for (Map.Entry<Long, List<Showtime>> entry : showtimesByMovieId.entrySet()) {
                        List<Showtime> movieShowtimes = entry.getValue();
                        Movie movie = movieShowtimes.get(0).getMovie();

                        // Format Genres
                        String genres = movie.getGenres().stream()
                                        .map(Genre::getName)
                                        .collect(Collectors.joining(", "));

                        // Group by Format
                        Map<String, List<Showtime>> showtimesByFormat = movieShowtimes.stream()
                                        .collect(Collectors.groupingBy(
                                                        s -> s.getFormat() != null ? s.getFormat() : "2D Phụ đề Việt",
                                                        LinkedHashMap::new, Collectors.toList()));

                        List<MovieShowtimeDto.FormatDto> formatDtos = new ArrayList<>();
                        for (Map.Entry<String, List<Showtime>> formatEntry : showtimesByFormat.entrySet()) {
                                List<MovieShowtimeDto.ShowtimeTimeDto> times = formatEntry.getValue().stream()
                                                .map(s -> MovieShowtimeDto.ShowtimeTimeDto.builder()
                                                                .id(s.getId())
                                                                .time(s.getStartTime().format(DateTimeFormatter.ofPattern("HH:mm")))
                                                                .roomName(s.getRoom() != null ? s.getRoom().getName() : "")
                                                                .build())
                                                .collect(Collectors.toList());

                                formatDtos.add(MovieShowtimeDto.FormatDto.builder()
                                                .name(formatEntry.getKey())
                                                .times(times)
                                                .build());
                        }

                        MovieShowtimeDto dto = MovieShowtimeDto.builder()
                                        .movieId(movie.getId())
                                        .title(movie.getTitle())
                                        .image(movie.getPosterUrl())
                                        .duration(movie.getDuration() + " phút")
                                        .genre(genres)
                                        .ageRating(movie.getAgeRating())
                                        .director("Đang cập nhật") // mock
                                        .cast("Đang cập nhật") // mock
                                        .description(movie.getDescription())
                                        .trailerUrl(movie.getTrailerUrl())
                                        .formats(formatDtos)
                                        .build();

                        result.add(dto);
                }

                return result;
        }



        public List<TheaterShowtimesResponse> getShowtimesByMovieAndProvinceAndDate(Long movieId, Long provinceId,
                        LocalDate date) {
                List<Showtime> showtimes = showtimeRepository
                                .findByMovieIdAndProvinceIdAndShowDateOrderByStartTimeAsc(movieId, provinceId, date);

                if (date != null) {
                        if (date.isBefore(LocalDate.now())) {
                                showtimes = new ArrayList<>();
                        } else if (date.equals(LocalDate.now())) {
                                java.time.LocalTime now = java.time.LocalTime.now();
                                showtimes = showtimes.stream()
                                                .filter(s -> s.getStartTime().isAfter(now))
                                                .collect(Collectors.toList());
                        }
                }

                // Group by Theater ID to avoid LazyInitializationException from Lombok's hashCode on Theater
                Map<Long, List<Showtime>> showtimesByTheaterId = showtimes.stream()
                                .collect(Collectors.groupingBy(s -> s.getTheater().getId(), LinkedHashMap::new,
                                                Collectors.toList()));

                List<TheaterShowtimesResponse> result = new ArrayList<>();
                for (Map.Entry<Long, List<Showtime>> entry : showtimesByTheaterId.entrySet()) {
                        Theater theater = entry.getValue().get(0).getTheater();
                        List<TheaterShowtimesResponse.ShowtimeDto> dtos = entry.getValue().stream()
                                        .map(s -> TheaterShowtimesResponse.ShowtimeDto.builder()
                                                        .id(s.getId())
                                                        .time(s.getStartTime()
                                                                        .format(DateTimeFormatter.ofPattern("HH:mm")))
                                                        .format(s.getFormat() != null ? s.getFormat()
                                                                        : "2D Phụ đề Việt")
                                                        .roomId(s.getRoom().getId())
                                                        .roomName(s.getRoom().getName())
                                                        .build())
                                        .collect(Collectors.toList());

                        result.add(TheaterShowtimesResponse.builder()
                                        .id(theater.getId())
                                        .name(theater.getName())
                                        .address(theater.getAddress())
                                        .phone(theater.getPhone())
                                        .showtimes(dtos)
                                        .build());
                }
                return result;
        }

        private void validateMovieFormat(Movie movie, String format) {
                if (movie.getFormats() == null || movie.getFormats().isEmpty()) {
                        throw new RuntimeException("Phim '" + movie.getTitle() + "' chưa được cấu hình định dạng chiếu.");
                }

                if (format == null || format.trim().isEmpty()) {
                        throw new RuntimeException("Định dạng chiếu không được để trống.");
                }

                String baseFormat = format.split(" -")[0].trim();

                boolean isValid = movie.getFormats().stream()
                                .anyMatch(f -> {
                                        String formatName = f.getName().trim();
                                        return baseFormat.equalsIgnoreCase(formatName)
                                                        || baseFormat.toLowerCase().startsWith(formatName.toLowerCase())
                                                        || formatName.toLowerCase().startsWith(baseFormat.toLowerCase());
                                });

                if (!isValid) {
                        String allowedFormats = movie.getFormats().stream()
                                        .map(com.Cinema.movie_backend.entity.MovieFormat::getName)
                                        .collect(Collectors.joining(", "));
                        throw new RuntimeException("Định dạng '" + format + "' không hợp lệ cho phim '" + movie.getTitle() + "'. Các định dạng được phép: " + allowedFormats);
                }
        }

        public void createBatchShowtimes(List<ShowtimeCreateRequest> requests) {
                List<Showtime> showtimes = requests.stream().map(req -> {
                        Showtime showtime = new Showtime();
                        Movie movie = movieRepository.findById(req.getMovieId())
                                        .orElseThrow(() -> new RuntimeException("Không tìm thấy phim với ID: " + req.getMovieId()));
                        String format = req.getFormat() != null ? req.getFormat() : "2D Phụ đề";
                        validateMovieFormat(movie, format);

                        showtime.setMovie(movie);
                        showtime.setTheater(theaterRepository.getReferenceById(req.getTheaterId()));
                        showtime.setRoom(roomRepository.getReferenceById(req.getRoomId()));
                        showtime.setShowDate(req.getShowDate());
                        showtime.setStartTime(req.getStartTime());
                        showtime.setEndTime(req.getEndTime());
                        showtime.setFormat(format);
                        showtime.setIsHidden(req.getIsHidden() != null ? req.getIsHidden() : false);
                        showtime.setIsDraft(req.getIsDraft() != null ? req.getIsDraft() : false);
                        return showtime;
                }).collect(Collectors.toList());

                showtimeRepository.saveAll(showtimes);
        }

        @org.springframework.transaction.annotation.Transactional
        public void deleteDrafts() {
                showtimeRepository.deleteByIsDraftTrue();
        }

        @org.springframework.transaction.annotation.Transactional
        public void publishDrafts() {
                showtimeRepository.publishDrafts();
        }

        public List<AdminShowtimeDto> getAllAdminShowtimes(Long theaterId, LocalDate date) {
                List<Showtime> showtimes = showtimeRepository.findAll();

                return showtimes.stream()
                                .filter(s -> theaterId == null || s.getTheater().getId().equals(theaterId))
                                .filter(s -> date == null || s.getShowDate().equals(date))
                                .map(s -> AdminShowtimeDto.builder()
                                                .id(s.getId())
                                                .theaterId(s.getTheater().getId())
                                                .movieId(s.getMovie().getId())
                                                .movieTitle(s.getMovie().getTitle())
                                                .roomId(s.getRoom().getId())
                                                .roomName(s.getRoom().getName())
                                                .showDate(s.getShowDate())
                                                .startTime(s.getStartTime())
                                                .endTime(s.getEndTime())
                                                .format(s.getFormat())
                                                .isHidden(s.getIsHidden())
                                                .build())
                                .collect(Collectors.toList());
        }

        public org.springframework.data.domain.Page<AdminShowtimeDto> searchShowtimes(
                        Long theaterId, Long movieId, Long roomId, String genre,
                        LocalDate startDate, LocalDate endDate,
                        java.time.LocalTime startTime, java.time.LocalTime endTime,
                        String format, String statusTab,
                        org.springframework.data.domain.Pageable pageable) {

                org.springframework.data.jpa.domain.Specification<Showtime> spec = ShowtimeSpecification.buildSpecification(
                                theaterId, movieId, roomId, genre, startDate, endDate, startTime, endTime, format, statusTab);

                org.springframework.data.domain.Page<Showtime> showtimesPage = showtimeRepository.findAll(spec, pageable);

                return showtimesPage.map(s -> AdminShowtimeDto.builder()
                                .id(s.getId())
                                .theaterId(s.getTheater().getId())
                                .movieId(s.getMovie().getId())
                                .movieTitle(s.getMovie().getTitle())
                                .roomId(s.getRoom().getId())
                                .roomName(s.getRoom().getName())
                                .showDate(s.getShowDate())
                                .startTime(s.getStartTime())
                                .endTime(s.getEndTime())
                                .format(s.getFormat())
                                .isHidden(s.getIsHidden())
                                .build());
        }

        public List<AdminShowtimeDto> getShowtimesByDateRange(LocalDate startDate, LocalDate endDate) {
                List<Showtime> showtimes = showtimeRepository.findByShowDateBetween(startDate, endDate);
                return showtimes.stream().map(s -> AdminShowtimeDto.builder()
                                .id(s.getId())
                                .theaterId(s.getTheater().getId())
                                .movieId(s.getMovie().getId())
                                .movieTitle(s.getMovie().getTitle())
                                .roomId(s.getRoom().getId())
                                .roomName(s.getRoom().getName())
                                .showDate(s.getShowDate())
                                .startTime(s.getStartTime())
                                .endTime(s.getEndTime())
                                .format(s.getFormat())
                                .isHidden(s.getIsHidden())
                                .build())
                                .collect(Collectors.toList());
        }

        @org.springframework.transaction.annotation.Transactional
        public void deleteAllShowtimes() {
                bookingRepository.deleteAllInBatch();
                showtimeRepository.deleteAllInBatch();
        }

        public void updateShowtimeFormat(Long id, String format) {
                Showtime showtime = showtimeRepository.findById(id)
                                .orElseThrow(() -> new RuntimeException("Không tìm thấy suất chiếu với ID: " + id));
                validateMovieFormat(showtime.getMovie(), format);
                showtime.setFormat(format);
                showtimeRepository.save(showtime);
        }

        public AdminShowtimeDto updateShowtime(Long id, ShowtimeUpdateRequest request) {
                Showtime showtime = showtimeRepository.findById(id)
                                .orElseThrow(() -> new RuntimeException("Không tìm thấy suất chiếu với ID: " + id));

                Movie movie = showtime.getMovie();
                if (request.getMovieId() != null) {
                        movie = movieRepository.findById(request.getMovieId())
                                        .orElseThrow(() -> new RuntimeException("Không tìm thấy phim với ID: " + request.getMovieId()));
                        showtime.setMovie(movie);
                }
                if (request.getRoomId() != null) {
                        showtime.setRoom(roomRepository.getReferenceById(request.getRoomId()));
                }
                if (request.getShowDate() != null) {
                        showtime.setShowDate(request.getShowDate());
                }
                if (request.getStartTime() != null) {
                        showtime.setStartTime(request.getStartTime());
                }
                if (request.getEndTime() != null) {
                        showtime.setEndTime(request.getEndTime());
                }
                if (request.getFormat() != null) {
                        validateMovieFormat(movie, request.getFormat());
                        showtime.setFormat(request.getFormat());
                } else if (request.getMovieId() != null) {
                        validateMovieFormat(movie, showtime.getFormat());
                }

                Showtime saved = showtimeRepository.save(showtime);

                return AdminShowtimeDto.builder()
                                .id(saved.getId())
                                .theaterId(saved.getTheater().getId())
                                .movieId(saved.getMovie().getId())
                                .movieTitle(saved.getMovie().getTitle())
                                .roomId(saved.getRoom().getId())
                                .roomName(saved.getRoom().getName())
                                .showDate(saved.getShowDate())
                                .startTime(saved.getStartTime())
                                .endTime(saved.getEndTime())
                                .format(saved.getFormat())
                                .isHidden(saved.getIsHidden())
                                .build();
        }

        public Showtime toggleShowtimeVisibility(Long id) {
                Showtime showtime = showtimeRepository.findById(id)
                                .orElseThrow(() -> new RuntimeException("Không tìm thấy suất chiếu với ID: " + id));
                Boolean currentHidden = showtime.getIsHidden();
                showtime.setIsHidden(currentHidden != null ? !currentHidden : true);
                return showtimeRepository.save(showtime);
        }


        /**
         * Lấy thông tin suất chiếu + danh sách ghế thực tế của phòng (do admin thiết
         * kế).
         * Dùng cho trang chọn ghế của user (BookingPage).
         */
        public ShowtimeSeatResponse getShowtimeWithSeats(Long showtimeId) {
                Showtime showtime = showtimeRepository.findById(showtimeId)
                                .orElseThrow(() -> new RuntimeException(
                                                "Không tìm thấy suất chiếu với ID: " + showtimeId));

                Movie movie = showtime.getMovie();
                Theater theater = showtime.getTheater();

                // Lấy danh sách ghế thực tế của phòng chiếu (admin đã thiết kế)
                List<Seat> seats = seatRepository.findByRoomId(showtime.getRoom().getId());
                List<Long> completedSeats = ticketRepository.findCompletedSeatIdsByShowtime(showtimeId);
                List<Long> pendingSeats = ticketRepository.findPendingSeatIdsByShowtime(showtimeId);

                List<SeatResponse> seatResponses = seats.stream()
                                .map(s -> {
                                        String finalStatus = s.getStatus();
                                        if (completedSeats.contains(s.getId())) {
                                                finalStatus = "BOOKED";
                                        } else if (pendingSeats.contains(s.getId())) {
                                                finalStatus = "RESERVED";
                                        }
                                        return SeatResponse.builder()
                                                .id(s.getId())
                                                .rowSymbol(s.getRowSymbol())
                                                .seatNumber(s.getSeatNumber())
                                                .seatType(s.getSeatType())
                                                .status(finalStatus)
                                                .rowIndex(s.getRowIndex())
                                                .columnIndex(s.getColumnIndex())
                                                .build();
                                })
                                .collect(Collectors.toList());

                DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");
                DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");

                ShowtimeSeatResponse.ShowDto showDto = ShowtimeSeatResponse.ShowDto.builder()
                                .id(showtime.getId())
                                .movieId(movie.getId())
                                .movieTitle(movie.getTitle())
                                .moviePosterUrl(movie.getPosterUrl())
                                .movieTrailerUrl(movie.getTrailerUrl())
                                .theaterId(theater.getId())
                                .theaterName(theater.getName())
                                .theaterAddress(theater.getAddress())
                                .roomId(showtime.getRoom().getId())
                                .roomName(showtime.getRoom().getName())
                                .showDate(showtime.getShowDate().format(dateFmt))
                                .startTime(showtime.getStartTime().format(timeFmt))
                                .endTime(showtime.getEndTime() != null ? showtime.getEndTime().format(timeFmt) : null)
                                .format(showtime.getFormat())
                                .roomMatrixWidth(showtime.getRoom().getMatrixWidth())
                                .roomMatrixHeight(showtime.getRoom().getMatrixHeight())
                                .entranceSide(showtime.getRoom().getEntranceSide())
                                .entranceOffset(showtime.getRoom().getEntranceOffset())
                                .exitSide(showtime.getRoom().getExitSide())
                                .exitOffset(showtime.getRoom().getExitOffset())
                                .entrancePositions(parseAccessPositions(showtime.getRoom().getEntrancePositions(), "LEFT:0"))
                                .exitPositions(parseAccessPositions(showtime.getRoom().getExitPositions(), "RIGHT:0"))
                                .prices(getPricesForShowtime(showtime))
                                .maxSeatsPerUser(showtime.getRoom().getMaxSeatsPerUser())
                                .build();

                return ShowtimeSeatResponse.builder()
                                .show(showDto)
                                .seats(seatResponses)
                                .build();
        }

        private List<String> parseAccessPositions(String positions, String fallback) {
                String value = positions == null || positions.isBlank() ? fallback : positions;
                return List.of(value.split(","));
        }

        private java.util.Map<String, java.math.BigDecimal> getPricesForShowtime(Showtime showtime) {
                java.util.Map<String, java.math.BigDecimal> prices = new java.util.HashMap<>();
                
                AudienceType audience = AudienceType.ADULT;
                RoomType room = showtime.getRoom().getRoomType() != null ? showtime.getRoom().getRoomType() : RoomType.LO_RAP;
                
                java.time.DayOfWeek dow = showtime.getShowDate().getDayOfWeek();
                DayType day = (dow == java.time.DayOfWeek.FRIDAY || dow == java.time.DayOfWeek.SATURDAY || dow == java.time.DayOfWeek.SUNDAY)
                        ? DayType.WEEKEND : DayType.WEEKDAY;

                LocalDate today = LocalDate.now();

                ticketPriceRepository.findActivePrice(audience, SeatType.NORMAL, room, day, today)
                        .ifPresent(tp -> prices.put("normal", tp.getPrice()));
                
                ticketPriceRepository.findActivePrice(audience, SeatType.VIP, room, day, today)
                        .ifPresent(tp -> prices.put("vip", tp.getPrice()));
                
                ticketPriceRepository.findActivePrice(audience, SeatType.SWEETBOX, room, day, today)
                        .ifPresent(tp -> prices.put("couple", tp.getPrice()));
                        
                ticketPriceRepository.findActivePrice(audience, SeatType.BED, room, day, today)
                        .ifPresent(tp -> prices.put("bed", tp.getPrice()));

                return prices;
        }
}
