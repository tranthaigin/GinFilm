package com.Cinema.movie_backend.component;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class MemberPointsMigration implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        String sql = """
                UPDATE users u
                SET member_points =
                    COALESCE((
                        SELECT CAST(COALESCE(SUM(FLOOR(COALESCE(b.total_amount, 0) / 1000)), 0) AS INTEGER)
                        FROM bookings b
                        WHERE b.user_id = u.id
                          AND b.status = 'COMPLETED'
                    ), 0)
                    +
                    COALESCE((
                        SELECT CAST(COALESCE(SUM(FLOOR(COALESCE(ot.price, 0) / 1000)), 0) AS INTEGER)
                        FROM online_tickets ot
                        WHERE ot.user_id = u.id
                          AND COALESCE(ot.is_banned, false) = false
                    ), 0)
                WHERE u.member_points IS NULL
                """;

        int migratedUsers = jdbcTemplate.update(sql);
        if (migratedUsers > 0) {
            System.out.println("Member points migration completed for " + migratedUsers + " users.");
        }
    }
}
