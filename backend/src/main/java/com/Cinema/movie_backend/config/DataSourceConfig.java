package com.Cinema.movie_backend.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;

import javax.sql.DataSource;
import java.net.URI;
import java.net.URISyntaxException;

/**
 * Custom DataSource config cho Railway production.
 * Railway inject DATABASE_URL dạng: postgresql://user:pass@host:port/db
 * Spring Boot cần JDBC URL nên ta phải parse thủ công.
 */
@Configuration
@Profile("prod")
public class DataSourceConfig {

    @Value("${DATABASE_URL}")
    private String databaseUrl;

    @Bean
    @Primary
    public DataSource dataSource() throws URISyntaxException {
        // Parse Railway DATABASE_URL: postgresql://user:pass@host:port/dbname
        URI uri = new URI(databaseUrl);

        String host = uri.getHost();
        int port = uri.getPort();
        String database = uri.getPath().replaceFirst("/", "");

        String userInfo = uri.getUserInfo(); // "user:password"
        String username = userInfo.split(":")[0];
        String password = userInfo.split(":", 2)[1];

        String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + "/" + database;

        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(jdbcUrl);
        config.setUsername(username);
        config.setPassword(password);
        config.setDriverClassName("org.postgresql.Driver");
        config.setMaximumPoolSize(5);
        config.setConnectionTimeout(30000);
        config.setMinimumIdle(1);

        return new HikariDataSource(config);
    }
}
