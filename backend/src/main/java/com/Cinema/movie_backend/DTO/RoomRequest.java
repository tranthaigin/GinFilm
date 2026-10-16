package com.Cinema.movie_backend.DTO;

import lombok.Data;
import java.util.List;

@Data
public class RoomRequest {
    private String name;
    private String roomType;
    private Integer capacity;
    private Boolean isActive;
    private Integer matrixWidth;
    private Integer matrixHeight;
    private String entranceSide;
    private Integer entranceOffset;
    private String exitSide;
    private Integer exitOffset;
    private List<String> entrancePositions;
    private List<String> exitPositions;
    private Integer maxSeatsPerUser;
    private List<SeatRequest> seats;
}
