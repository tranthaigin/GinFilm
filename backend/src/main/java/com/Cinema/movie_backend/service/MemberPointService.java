package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MemberPointService {

    static final double VND_PER_MEMBER_POINT = 1_000.0;
    private final MembershipPolicyService membershipPolicyService;

    public int calculateEarnedPoints(Double paidAmount) {
        if (paidAmount == null || paidAmount <= 0) {
            return 0;
        }
        return (int) Math.floor(paidAmount / VND_PER_MEMBER_POINT);
    }

    public int award(User user, Double paidAmount) {
        if (user == null) {
            return 0;
        }

        int earnedPoints = calculateEarnedPoints(paidAmount);
        if (earnedPoints > 0) {
            int currentPoints = user.getMemberPoints() != null ? user.getMemberPoints() : 0;
            user.setMemberPoints(currentPoints + earnedPoints);
            membershipPolicyService.recordEarnedPoints(user, earnedPoints);
        }
        return earnedPoints;
    }

    public void reverse(User user, Integer earnedPoints) {
        if (user == null || earnedPoints == null || earnedPoints <= 0) {
            return;
        }

        int currentPoints = user.getMemberPoints() != null ? user.getMemberPoints() : 0;
        user.setMemberPoints(Math.max(0, currentPoints - earnedPoints));
        membershipPolicyService.reverseEarnedPoints(user, earnedPoints);
    }
}
