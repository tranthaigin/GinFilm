package com.Cinema.movie_backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentials;
import software.amazon.awssdk.auth.credentials.AwsSessionCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

@Configuration
public class AwsS3Config {

    @Value("${app.s3.access-key-id:}")
    private String accessKeyId;

    @Value("${app.s3.secret-access-key:}")
    private String secretAccessKey;

    @Value("${app.s3.session-token:}")
    private String sessionToken;

    @Value("${app.s3.region:ap-southeast-1}")
    private String region;

    private AwsCredentials getCredentials() {
        if (accessKeyId == null || accessKeyId.isBlank() || secretAccessKey == null || secretAccessKey.isBlank()) {
            return null;
        }
        if (sessionToken != null && !sessionToken.isBlank()) {
            return AwsSessionCredentials.create(accessKeyId, secretAccessKey, sessionToken);
        }
        return AwsBasicCredentials.create(accessKeyId, secretAccessKey);
    }

    @Bean
    public S3Client s3Client() {
        AwsCredentials credentials = getCredentials();
        if (credentials == null) {
            return null;
        }

        return S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .build();
    }

    @Bean
    public S3Presigner s3Presigner() {
        AwsCredentials credentials = getCredentials();
        if (credentials == null) {
            return null;
        }

        return S3Presigner.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .build();
    }
}
