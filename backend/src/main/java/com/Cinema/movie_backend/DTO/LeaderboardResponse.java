package com.Cinema.movie_backend.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaderboardResponse {
    private String period;
    private LocalDate startDate;
    private LocalDate endDate;
    private List<Entry> entries;
    private Entry currentUser;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Entry {
        private int rank;
        private String displayName;
        private String avatar;
        private int memberPoints;
        private int membershipTier;
        private long totalSpent;
        private long purchaseCount;
        private boolean currentUser;
    }
}
