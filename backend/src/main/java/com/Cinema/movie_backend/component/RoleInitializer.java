package com.Cinema.movie_backend.component;

import com.Cinema.movie_backend.entity.Role;
import com.Cinema.movie_backend.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Required roles for registration on an empty database; no accounts are created. */
@Component
@Order(0)
@RequiredArgsConstructor
public class RoleInitializer implements CommandLineRunner {
    private final RoleRepository roles;

    @Override
    @Transactional
    public void run(String... args) {
        for (String name : java.util.List.of("ROLE_ADMIN", "ROLE_STAFF", "ROLE_USER")) {
            if (roles.findByNameManual(name).isEmpty()) roles.save(new Role(null, name, null));
        }
    }
}
