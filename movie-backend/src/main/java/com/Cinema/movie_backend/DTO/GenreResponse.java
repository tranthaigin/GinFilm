package com.Cinema.movie_backend.DTO;

import com.Cinema.movie_backend.entity.Genre;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GenreResponse {
    private Integer id;
    private String name;

    public static GenreResponse fromEntity(Genre genre) {
        return new GenreResponse(genre.getId(), genre.getName());
    }
}
