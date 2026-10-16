package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.DTO.LeaderboardResponse;
import com.Cinema.movie_backend.repository.BookingRepository;
import com.Cinema.movie_backend.repository.OnlineTicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LeaderboardService {
    private static final int TOP_LIMIT = 10;

    private final BookingRepository bookingRepository;
    private final OnlineTicketRepository onlineTicketRepository;

    @Transactional(readOnly = true)
    public LeaderboardResponse getLeaderboard(String requestedPeriod, UUID currentUserId) {
        String period = normalizePeriod(requestedPeriod);
        LocalDate today = LocalDate.now();
        LocalDate startDate = period.equals("month")
                ? today.withDayOfMonth(1)
                : today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate endDateExclusive = period.equals("month")
                ? startDate.plusMonths(1)
                : startDate.plusWeeks(1);

        Map<UUID, Aggregate> totals = new LinkedHashMap<>();
        merge(totals, bookingRepository.getLeaderboardTotals(
                startDate.atStartOfDay(), endDateExclusive.atStartOfDay()));
        merge(totals, onlineTicketRepository.getLeaderboardTotals(
                startDate.atStartOfDay(), endDateExclusive.atStartOfDay()));

        List<Aggregate> ranked = new ArrayList<>(totals.values());
        ranked.sort(Comparator.comparingLong(Aggregate::totalSpent).reversed()
                .thenComparing(Comparator.comparingLong(Aggregate::purchaseCount).reversed())
                .thenComparing(Aggregate::name, String.CASE_INSENSITIVE_ORDER));

        List<LeaderboardResponse.Entry> allEntries = new ArrayList<>();
        for (int index = 0; index < ranked.size(); index++) {
            Aggregate aggregate = ranked.get(index);
            allEntries.add(toEntry(aggregate, index + 1, aggregate.userId().equals(currentUserId)));
        }

        LeaderboardResponse.Entry currentUser = allEntries.stream()
                .filter(LeaderboardResponse.Entry::isCurrentUser)
                .findFirst()
                .orElse(null);

        return LeaderboardResponse.builder()
                .period(period)
                .startDate(startDate)
                .endDate(endDateExclusive.minusDays(1))
                .entries(allEntries.stream().limit(TOP_LIMIT).toList())
                .currentUser(currentUser)
                .build();
    }

    private void merge(Map<UUID, Aggregate> totals, List<Object[]> rows) {
        for (Object[] row : rows) {
            UUID userId = (UUID) row[0];
            String name = row[1] == null ? "Khách hàng" : row[1].toString();
            String avatar = row[2] == null ? null : row[2].toString();
            int memberPoints = row[3] == null ? 0 : ((Number) row[3]).intValue();
            int membershipTier = row[4] == null ? 0 : ((Number) row[4]).intValue();
            long amount = Math.round(((Number) row[5]).doubleValue());
            long count = ((Number) row[6]).longValue();

            totals.merge(userId, new Aggregate(userId, name, avatar, memberPoints, membershipTier, amount, count),
                    (left, right) -> new Aggregate(
                            userId,
                            left.name(),
                            left.avatar() != null ? left.avatar() : right.avatar(),
                            Math.max(left.memberPoints(), right.memberPoints()),
                            Math.max(left.membershipTier(), right.membershipTier()),
                            left.totalSpent() + right.totalSpent(),
                            left.purchaseCount() + right.purchaseCount()));
        }
    }

    private LeaderboardResponse.Entry toEntry(Aggregate value, int rank, boolean currentUser) {
        return LeaderboardResponse.Entry.builder()
                .rank(rank)
                .displayName(value.name())
                .avatar(value.avatar())
                .memberPoints(value.memberPoints())
                .membershipTier(value.membershipTier())
                .totalSpent(value.totalSpent())
                .purchaseCount(value.purchaseCount())
                .currentUser(currentUser)
                .build();
    }

    private String normalizePeriod(String requestedPeriod) {
        String period = requestedPeriod == null ? "week" : requestedPeriod.toLowerCase(Locale.ROOT);
        if (!period.equals("week") && !period.equals("month")) {
            throw new IllegalArgumentException("Khoảng xếp hạng chỉ hỗ trợ week hoặc month");
        }
        return period;
    }

    private record Aggregate(
            UUID userId,
            String name,
            String avatar,
            int memberPoints,
            int membershipTier,
            long totalSpent,
            long purchaseCount) {
    }
}
