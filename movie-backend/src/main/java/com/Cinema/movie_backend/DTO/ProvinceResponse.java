package com.Cinema.movie_backend.DTO;

import com.Cinema.movie_backend.entity.Province;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProvinceResponse {

    private Long id;
    private String name;
    private String slug;
    private List<TheaterResponse> theaters;
    private int theaterCount;

    /**
     * Chuyển đổi từ entity Province, kèm danh sách rạp
     */
    public static ProvinceResponse fromEntity(Province province) {
        List<TheaterResponse> theaterList = province.getTheaters() != null
                ? province.getTheaters().stream()
                        .map(TheaterResponse::fromEntity)
                        .collect(Collectors.toList())
                : Collections.emptyList();

        return ProvinceResponse.builder()
                .id(province.getId())
                .name(province.getName())
                .slug(province.getSlug())
                .theaters(theaterList)
                .theaterCount(theaterList.size())
                .build();
    }

    /**
     * Chuyển đổi không kèm danh sách rạp
     */
    public static ProvinceResponse fromEntityLight(Province province, int theaterCount) {
        return ProvinceResponse.builder()
                .id(province.getId())
                .name(province.getName())
                .slug(province.getSlug())
                .theaters(Collections.emptyList())
                .theaterCount(theaterCount)
                .build();
    }
}
