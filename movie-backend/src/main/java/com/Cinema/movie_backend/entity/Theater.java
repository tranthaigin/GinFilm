package com.Cinema.movie_backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "theaters", indexes = {
        @Index(name = "idx_theaters_province_id", columnList = "province_id"),
        @Index(name = "idx_theaters_name", columnList = "name")
})
public class Theater {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "address", length = 500)
    private String address;

    @Column(name = "phone", length = 20)
    private String phone;

    @Column(name = "image", length = 500)
    private String image;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "province_id",
            foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT),
            nullable = false)
    private Province province;
    @Builder.Default
    @Column(name = "is_active", nullable = false, columnDefinition = "boolean default true")
    private Boolean isActive = true;
}
