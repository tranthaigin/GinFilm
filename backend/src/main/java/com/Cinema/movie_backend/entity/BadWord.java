package com.Cinema.movie_backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(
        name = "bad_words",
        indexes = {
                @Index(name = "idx_bad_word_word", columnList = "word")
        }
)
public class BadWord {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "word", nullable = false, length = 255)
    private String word;

    @Column(name = "reason", length = 50)
    private String reason;

    @Column(name = "sub_reason", length = 50)
    private String subReason;
}
