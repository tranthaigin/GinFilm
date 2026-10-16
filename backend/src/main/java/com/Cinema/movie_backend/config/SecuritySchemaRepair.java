package com.Cinema.movie_backend.config;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import javax.sql.DataSource;

@Configuration
@RequiredArgsConstructor
public class SecuritySchemaRepair {
    private final DataSource dataSource;

    @Bean
    ApplicationRunner repairSecuritySchema() {
        return args -> new org.springframework.transaction.support.TransactionTemplate(
                new org.springframework.jdbc.support.JdbcTransactionManager(dataSource)).executeWithoutResult(status ->
                new ResourceDatabasePopulator(new ClassPathResource("db/security-repair.sql")).execute(dataSource));
    }
}
