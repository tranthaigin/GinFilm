package com.Cinema.movie_backend.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomResponse {
    private Long id;
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
    private Long theaterId;
    private List<SeatResponse> seats;
}
