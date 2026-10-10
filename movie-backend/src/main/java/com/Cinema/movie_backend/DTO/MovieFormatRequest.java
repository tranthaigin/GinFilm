package com.Cinema.movie_backend.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;
import com.Cinema.movie_backend.enums.RoomType;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MovieFormatRequest {
    private String name;
    private Set<RoomType> supportedRoomTypes;
}
