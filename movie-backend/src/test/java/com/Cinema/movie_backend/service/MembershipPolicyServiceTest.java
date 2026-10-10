package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.entity.User;
import com.Cinema.movie_backend.repository.SystemConfigRepository;
import com.Cinema.movie_backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MembershipPolicyServiceTest {

    @Mock
    private SystemConfigService systemConfigService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SystemConfigRepository systemConfigRepository;

    @InjectMocks
    private MembershipPolicyService service;

    private SystemConfigService.MembershipPolicy policy;

    @BeforeEach
    void setUp() {
        policy = new SystemConfigService.MembershipPolicy(
                2_000,
                4_000,
                10_000,
                3,
                new int[] { 0, 300, 500, 1_000 },
                new int[] { 0, 600, 1_000, 2_000 });
    }

    @Test
    void initializesExistingUserAtTheirCurrentTier() {
        User user = userWithPoints(8_000);
        when(systemConfigService.getMembershipPolicy()).thenReturn(policy);
        when(systemConfigRepository.findByKey(SystemConfigService.KEY_VIP_MEMBERSHIP_STATE_VERSION))
                .thenReturn(Optional.empty());
        when(userRepository.findAll()).thenReturn(List.of(user));

        service.initializeExistingMemberships();

        assertEquals(2, user.getMembershipTier());
        assertNotNull(user.getMembershipTierSince());
        assertEquals(0, user.getMemberPointsEarnedInCycle());
        verify(userRepository).saveAll(anyList());
    }

    @Test
    void keepsProtectedTierUntilReviewDate() {
        User user = protectedVip3(8_000, 0, LocalDateTime.now().minusMonths(2));
        when(systemConfigService.getMembershipPolicy()).thenReturn(policy);
        when(userRepository.findAllCustomers()).thenReturn(List.of(user));

        service.reviewDueMemberships();

        assertEquals(3, user.getMembershipTier());
        assertEquals(8_000, user.getMemberPoints());
        verify(userRepository, never()).saveAll(anyList());
    }

    @Test
    void appliesConfiguredPenaltyThenRecalculatesTierWhenCycleEnds() {
        User user = protectedVip3(8_500, 500, LocalDateTime.now().minusMonths(3).minusDays(1));
        when(systemConfigService.getMembershipPolicy()).thenReturn(policy);
        when(userRepository.findAllCustomers()).thenReturn(List.of(user));

        service.reviewDueMemberships();

        assertEquals(6_500, user.getMemberPoints());
        assertEquals(2, user.getMembershipTier());
        assertEquals(0, user.getMemberPointsEarnedInCycle());
        verify(userRepository).saveAll(anyList());
    }

    @Test
    void skipsPenaltyWhenActivityTargetIsMetButUsesCurrentThresholds() {
        User user = protectedVip3(9_000, 1_000, LocalDateTime.now().minusMonths(3).minusDays(1));
        when(systemConfigService.getMembershipPolicy()).thenReturn(policy);
        when(userRepository.findAllCustomers()).thenReturn(List.of(user));

        service.reviewDueMemberships();

        assertEquals(9_000, user.getMemberPoints());
        assertEquals(2, user.getMembershipTier());
        verify(userRepository).saveAll(anyList());
    }

    private static User userWithPoints(int points) {
        User user = new User();
        user.setMemberPoints(points);
        return user;
    }

    private static User protectedVip3(int points, int earnedInCycle, LocalDateTime since) {
        User user = userWithPoints(points);
        user.setMembershipTier(3);
        user.setMembershipTierSince(since);
        user.setMemberPointsEarnedInCycle(earnedInCycle);
        return user;
    }
}
