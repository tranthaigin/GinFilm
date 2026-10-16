package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.entity.User;
import com.Cinema.movie_backend.entity.SystemConfig;
import com.Cinema.movie_backend.repository.SystemConfigRepository;
import com.Cinema.movie_backend.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MembershipPolicyService {

    private final SystemConfigService systemConfigService;
    private final SystemConfigRepository systemConfigRepository;
    private final UserRepository userRepository;

    @PostConstruct
    @Transactional
    public void initializeExistingMemberships() {
        SystemConfigService.MembershipPolicy policy = systemConfigService.getMembershipPolicy();
        LocalDateTime now = LocalDateTime.now();
        List<User> changedUsers = new ArrayList<>();
        boolean firstPolicyInitialization = systemConfigRepository
                .findByKey(SystemConfigService.KEY_VIP_MEMBERSHIP_STATE_VERSION)
                .isEmpty();

        for (User user : userRepository.findAll()) {
            if (firstPolicyInitialization) {
                user.setMembershipTier(policy.tierForPoints(safePoints(user.getMemberPoints())));
                user.setMembershipTierSince(now);
                user.setMemberPointsEarnedInCycle(0);
                changedUsers.add(user);
            } else if (initializeUser(user, policy, now)) {
                changedUsers.add(user);
            }
        }
        if (!changedUsers.isEmpty()) {
            userRepository.saveAll(changedUsers);
        }
        if (firstPolicyInitialization) {
            systemConfigRepository.save(SystemConfig.builder()
                    .key(SystemConfigService.KEY_VIP_MEMBERSHIP_STATE_VERSION)
                    .value("1")
                    .description("Phiên bản khởi tạo trạng thái chu kỳ hạng thành viên")
                    .build());
        }
    }

    public void recordEarnedPoints(User user, int earnedPoints) {
        if (user == null || earnedPoints <= 0) {
            return;
        }

        SystemConfigService.MembershipPolicy policy = systemConfigService.getMembershipPolicy();
        LocalDateTime now = LocalDateTime.now();
        initializeUser(user, policy, now);

        int earnedInCycle = safePoints(user.getMemberPointsEarnedInCycle()) + earnedPoints;
        user.setMemberPointsEarnedInCycle(earnedInCycle);

        int calculatedTier = policy.tierForPoints(safePoints(user.getMemberPoints()));
        if (calculatedTier > safeTier(user.getMembershipTier())) {
            user.setMembershipTier(calculatedTier);
            user.setMembershipTierSince(now);
            user.setMemberPointsEarnedInCycle(0);
        }
    }

    public void reverseEarnedPoints(User user, int reversedPoints) {
        if (user == null || reversedPoints <= 0) {
            return;
        }
        user.setMemberPointsEarnedInCycle(Math.max(
                0,
                safePoints(user.getMemberPointsEarnedInCycle()) - reversedPoints));
    }

    @Scheduled(cron = "0 15 3 * * ?")
    @Transactional
    public void reviewDueMemberships() {
        SystemConfigService.MembershipPolicy policy = systemConfigService.getMembershipPolicy();
        LocalDateTime now = LocalDateTime.now();
        List<User> changedUsers = new ArrayList<>();

        for (User user : userRepository.findAllCustomers()) {
            boolean changed = initializeUser(user, policy, now);
            int currentTier = safeTier(user.getMembershipTier());

            if (currentTier > 0
                    && !user.getMembershipTierSince().plusMonths(policy.reviewPeriodMonths()).isAfter(now)) {
                int earnedInCycle = safePoints(user.getMemberPointsEarnedInCycle());
                if (earnedInCycle < policy.requiredEarnedPointsFor(currentTier)) {
                    int currentPoints = safePoints(user.getMemberPoints());
                    user.setMemberPoints(Math.max(0, currentPoints - policy.penaltyPointsFor(currentTier)));
                }

                user.setMembershipTier(policy.tierForPoints(safePoints(user.getMemberPoints())));
                user.setMembershipTierSince(now);
                user.setMemberPointsEarnedInCycle(0);
                changed = true;
            }

            if (changed) {
                changedUsers.add(user);
            }
        }

        if (!changedUsers.isEmpty()) {
            userRepository.saveAll(changedUsers);
        }
    }

    @Transactional
    public void promoteEligibleUsers() {
        SystemConfigService.MembershipPolicy policy = systemConfigService.getMembershipPolicy();
        LocalDateTime now = LocalDateTime.now();
        List<User> changedUsers = new ArrayList<>();

        for (User user : userRepository.findAllCustomers()) {
            boolean changed = initializeUser(user, policy, now);
            int calculatedTier = policy.tierForPoints(safePoints(user.getMemberPoints()));
            if (calculatedTier > safeTier(user.getMembershipTier())) {
                user.setMembershipTier(calculatedTier);
                user.setMembershipTierSince(now);
                user.setMemberPointsEarnedInCycle(0);
                changed = true;
            }
            if (changed) {
                changedUsers.add(user);
            }
        }

        if (!changedUsers.isEmpty()) {
            userRepository.saveAll(changedUsers);
        }
    }

    private boolean initializeUser(
            User user,
            SystemConfigService.MembershipPolicy policy,
            LocalDateTime now) {
        boolean changed = false;
        boolean hasNoCycleYet = user.getMembershipTierSince() == null;
        if (user.getMembershipTier() == null || hasNoCycleYet) {
            user.setMembershipTier(policy.tierForPoints(safePoints(user.getMemberPoints())));
            changed = true;
        }
        if (hasNoCycleYet) {
            user.setMembershipTierSince(now);
            changed = true;
        }
        if (user.getMemberPointsEarnedInCycle() == null) {
            user.setMemberPointsEarnedInCycle(0);
            changed = true;
        }
        return changed;
    }

    private int safePoints(Integer points) {
        return points == null ? 0 : Math.max(0, points);
    }

    private int safeTier(Integer tier) {
        return tier == null ? 0 : Math.max(0, Math.min(3, tier));
    }
}
