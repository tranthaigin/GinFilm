package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.DTO.BadWordRequest;
import com.Cinema.movie_backend.DTO.BadWordResponse;
import com.Cinema.movie_backend.entity.BadWord;
import com.Cinema.movie_backend.repository.BadWordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BadWordService {

    private final BadWordRepository badWordRepository;

    public List<BadWordResponse> getAllBadWords() {
        return badWordRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public BadWordResponse addBadWord(BadWordRequest request) {
        if (request.getWord() == null || request.getWord().trim().isEmpty()) {
            throw new IllegalArgumentException("Từ cấm không được để trống");
        }

        BadWord badWord = BadWord.builder()
                .word(request.getWord().trim().toLowerCase())
                .reason(request.getReason())
                .subReason(request.getSubReason())
                .build();
        return toResponse(badWordRepository.save(badWord));
    }

    @Transactional
    public BadWordResponse updateBadWord(UUID id, BadWordRequest request) {
        BadWord badWord = badWordRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy từ khóa"));

        if (request.getWord() != null && !request.getWord().trim().isEmpty()) {
            badWord.setWord(request.getWord().trim().toLowerCase());
        }
        badWord.setReason(request.getReason());
        badWord.setSubReason(request.getSubReason());

        return toResponse(badWordRepository.save(badWord));
    }

    @Transactional
    public void deleteBadWord(UUID id) {
        if (!badWordRepository.existsById(id)) {
            throw new IllegalArgumentException("Không tìm thấy từ khóa");
        }
        badWordRepository.deleteById(id);
    }

    private BadWordResponse toResponse(BadWord badWord) {
        return BadWordResponse.builder()
                .id(badWord.getId())
                .word(badWord.getWord())
                .reason(badWord.getReason())
                .subReason(badWord.getSubReason())
                .build();
    }
}
