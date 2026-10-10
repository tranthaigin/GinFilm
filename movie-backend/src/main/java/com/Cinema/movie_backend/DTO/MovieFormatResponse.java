package com.Cinema.movie_backend.DTO;

import com.Cinema.movie_backend.entity.MovieFormat;
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
public class MovieFormatResponse {
    private Long id;
    private String name;
    private Boolean isDeleted;
    private Set<RoomType> supportedRoomTypes;

    public static MovieFormatResponse fromEntity(MovieFormat format) {
        if (format == null) return null;
        return MovieFormatResponse.builder()
                .id(format.getId())
                .name(format.getName())
                .isDeleted(format.getIsDeleted())
                .supportedRoomTypes(format.getSupportedRoomTypes())
                .build();
    }
}
