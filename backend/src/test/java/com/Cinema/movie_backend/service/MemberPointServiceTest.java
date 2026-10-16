package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.entity.User;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.junit.jupiter.api.Assertions.assertEquals;

class MemberPointServiceTest {

    private final MembershipPolicyService membershipPolicyService = Mockito.mock(MembershipPolicyService.class);
    private final MemberPointService service = new MemberPointService(membershipPolicyService);

    @Test
    void calculatesOnePointForEveryOneThousandVndPaid() {
        assertEquals(0, service.calculateEarnedPoints(null));
        assertEquals(0, service.calculateEarnedPoints(999.0));
        assertEquals(1, service.calculateEarnedPoints(1_000.0));
        assertEquals(75, service.calculateEarnedPoints(75_433.0));
    }

    @Test
    void awardingMemberPointsDoesNotChangeRewardPoints() {
        User user = new User();
        user.setRewardPoints(120);
        user.setMemberPoints(40);

        assertEquals(55, service.award(user, 55_000.0));
        assertEquals(95, user.getMemberPoints());
        assertEquals(120, user.getRewardPoints());
    }

    @Test
    void reversingMemberPointsNeverMakesTheBalanceNegative() {
        User user = new User();
        user.setRewardPoints(25);
        user.setMemberPoints(10);

        service.reverse(user, 15);

        assertEquals(0, user.getMemberPoints());
        assertEquals(25, user.getRewardPoints());
    }
}
