package com.Cinema.movie_backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import java.time.Duration;

@Service
public class S3MediaService {

    @Autowired(required = false)
    private S3Presigner s3Presigner;

    @Value("${app.s3.bucket:java-06}")
    private String bucketName;

    @Value("${app.s3.presign-ttl-seconds:3600}")
    private long presignTtlSeconds;

    @Value("${app.s3.public-base-url:https://java-06.s3.ap-southeast-1.amazonaws.com}")
    private String publicBaseUrl;

    public String generatePresignedUrl(String key) {
        if (s3Presigner == null) {
            // Fallback to public URL if S3 is not configured
            return publicBaseUrl + "/" + key;
        }

        try {
            GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build();

            GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofSeconds(presignTtlSeconds))
                    .getObjectRequest(getObjectRequest)
                    .build();

            PresignedGetObjectRequest presignedRequest = s3Presigner.presignGetObject(presignRequest);
            return presignedRequest.url().toString();
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    public String getPublicUrl(String key) {
        return publicBaseUrl + "/" + key;
    }
}
