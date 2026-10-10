package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.DTO.DashboardDTO;
import com.Cinema.movie_backend.entity.Booking;
import com.Cinema.movie_backend.repository.BookingRepository;
import com.Cinema.movie_backend.repository.MovieRepository;
import com.Cinema.movie_backend.repository.TicketRepository;
import com.Cinema.movie_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final BookingRepository bookingRepository;
    private final TicketRepository ticketRepository;
    private final MovieRepository movieRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public DashboardDTO getDashboardData() {
        Double totalRevenue = bookingRepository.getTotalRevenue();
        Long totalTickets = ticketRepository.countTotalTickets();
        Long totalMovies = movieRepository.count();
        Long totalCustomers = userRepository.countTotalCustomers();

        DashboardDTO.KPICards kpiCards = DashboardDTO.KPICards.builder()
                .totalRevenue(new DashboardDTO.KPIValue(totalRevenue != null ? totalRevenue : 0, 0, "Tổng doanh thu"))
                .totalTickets(new DashboardDTO.KPIValue(totalTickets != null ? totalTickets : 0, 0, "Tổng vé bán"))
                .totalMovies(new DashboardDTO.KPIValue(totalMovies != null ? totalMovies : 0, 0, "Tổng số phim"))
                .totalCustomers(
                        new DashboardDTO.KPIValue(totalCustomers != null ? totalCustomers : 0, 0, "Tổng khách hàng"))
                .build();

        java.time.LocalDateTime fourteenDaysAgo = LocalDate.now().minusDays(13).atStartOfDay();
        List<Booking> recentChartBookings = bookingRepository.findByStatusAndBookingTimeAfter(
                com.Cinema.movie_backend.enums.BookingStatus.COMPLETED, fourteenDaysAgo);

        java.util.Map<LocalDate, List<Booking>> bookingsByDate = recentChartBookings.stream()
                .filter(b -> b.getBookingTime() != null)
                .collect(Collectors.groupingBy(b -> b.getBookingTime().toLocalDate()));

        List<DashboardDTO.RevenueData> revenueData = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM");
        for (int i = 13; i >= 0; i--) {
            LocalDate date = LocalDate.now().minusDays(i);
            List<Booking> bookingsOnDate = bookingsByDate.getOrDefault(date, new ArrayList<>());
            double dailyRevenue = bookingsOnDate.stream()
                    .filter(b -> b.getTickets() != null)
                    .flatMap(b -> b.getTickets().stream())
                    .mapToDouble(com.Cinema.movie_backend.entity.Ticket::getPrice)
                    .sum();
            long dailyTickets = bookingsOnDate.stream()
                    .mapToLong(b -> b.getTickets() != null ? b.getTickets().size() : 0).sum();
            revenueData.add(new DashboardDTO.RevenueData(date.format(formatter), dailyRevenue, dailyTickets));
        }

        List<Object[]> distributionRaw = ticketRepository.getTicketDistributionByGenre();
        List<DashboardDTO.TicketDistribution> ticketDistribution = new ArrayList<>();
        // Distinct premium modern UI colors for easy visualization
        String[] colors = { 
            "#E22753", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", 
            "#06B6D4", "#F97316", "#EC4899", "#14B8A6", "#6366F1", "#84CC16" 
        };
        int colorIdx = 0;
        for (Object[] row : distributionRaw) {
            String name = (String) row[0];
            long value = row[1] != null ? ((Number) row[1]).longValue() : 0;
            ticketDistribution.add(new DashboardDTO.TicketDistribution(name, value, colors[colorIdx % colors.length]));
            colorIdx++;
        }

        Page<Object[]> topMoviesRaw = movieRepository.getTopMoviesByRevenue(PageRequest.of(0, 5));
        List<DashboardDTO.TopMovie> topMovies = new ArrayList<>();
        for (Object[] row : topMoviesRaw.getContent()) {
            Long id = (Long) row[0];
            String title = (String) row[1];
            String poster = (String) row[2];
            double revenue = row[3] != null ? ((Number) row[3]).doubleValue() : 0;
            Long ticketsCount = ticketRepository.countTicketsByMovieId(id);
            long tickets = ticketsCount != null ? ticketsCount : 0;
            topMovies.add(new DashboardDTO.TopMovie(id, title, poster, revenue, tickets));
        }

        Long nowShowingCount = movieRepository.countNowShowingMovies();



        DashboardDTO.TotalUsers totalUsersObj = new DashboardDTO.TotalUsers(
                totalCustomers != null ? totalCustomers : 0,
                0 // Change percentage not calculated
        );

        return DashboardDTO.builder()
                .kpiCards(kpiCards)
                .revenueData(revenueData)
                .ticketDistribution(ticketDistribution)
                .topMovies(topMovies)
                .nowShowingCount(nowShowingCount != null ? nowShowingCount.intValue() : 0)

                .totalUsers(totalUsersObj)
                .build();
    }
}
