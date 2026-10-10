package com.Cinema.movie_backend.DTO;

import lombok.Data;
import java.util.UUID;

@Data
public class StaffEmailRequest {
    private UUID staffId;
    private String subject;
    private String content;
}
