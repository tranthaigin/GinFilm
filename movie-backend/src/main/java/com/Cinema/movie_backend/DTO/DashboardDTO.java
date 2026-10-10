package com.Cinema.movie_backend.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardDTO {
    private KPICards kpiCards;
    private List<RevenueData> revenueData;
    private List<TicketDistribution> ticketDistribution;
    private List<TopMovie> topMovies;
    private int nowShowingCount;

    private TotalUsers totalUsers;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class KPICards {
        private KPIValue totalRevenue;
        private KPIValue totalTickets;
        private KPIValue totalMovies;
        private KPIValue totalCustomers;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class KPIValue {
        private double value;
        private double change;
        private String label;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RevenueData {
        private String month;
        private double revenue;
        private long tickets;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TicketDistribution {
        private String name;
        private long value;
        private String color;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopMovie {
        private Long id;
        private String title;
        private String poster;
        private double revenue;
        private long tickets;
    }



    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TotalUsers {
        private long value;
        private double change;
    }
}
