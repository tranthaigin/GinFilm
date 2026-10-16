package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.DTO.ComboCreateRequest;
import com.Cinema.movie_backend.DTO.ComboResponse;
import com.Cinema.movie_backend.DTO.ComboUpdateRequest;
import com.Cinema.movie_backend.entity.Combo;
import com.Cinema.movie_backend.repository.ComboRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import com.Cinema.movie_backend.repository.BookingComboRepository;
import java.util.Map;
import java.util.HashMap;

@Service
public class ComboService {

    @Autowired
    private ComboRepository comboRepository;

    @Autowired
    private BookingComboRepository bookingComboRepository;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private com.Cinema.movie_backend.repository.UserRepository userRepository;

    @Autowired
    private NotificationService notificationService;

    private ComboResponse mapToResponse(Combo combo, Integer sold, Long revenue) {
        Integer finalPrice = combo.getPrice();
        Integer activeDiscountPercent = combo.getDiscountPercent();
        
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        if (activeDiscountPercent != null && activeDiscountPercent > 0) {
            boolean isDiscountActive = true;
            if (combo.getDiscountStartDate() != null && now.isBefore(combo.getDiscountStartDate())) {
                isDiscountActive = false;
            }
            if (combo.getDiscountEndDate() != null && now.isAfter(combo.getDiscountEndDate())) {
                isDiscountActive = false;
            }
            
            if (isDiscountActive) {
                finalPrice = combo.getPrice() - (combo.getPrice() * activeDiscountPercent / 100);
            } else {
                activeDiscountPercent = 0;
            }
        } else {
            activeDiscountPercent = 0;
        }

        return ComboResponse.builder()
                .id(combo.getId())
                .name(combo.getName())
                .imageUrl(combo.getImageUrl())
                .description(combo.getDescription())
                .type(combo.getType())
                .status(combo.getStatus())
                .price(combo.getPrice())
                .discountPercent(activeDiscountPercent)
                .originalDiscountPercent(combo.getDiscountPercent())
                .finalPrice(finalPrice)
                .isHidden(combo.getIsHidden())
                .discountStartDate(combo.getDiscountStartDate())
                .discountEndDate(combo.getDiscountEndDate())
                .sold(sold)
                .revenue(revenue)
                .createdAt(combo.getCreatedAt())
                .updatedAt(combo.getUpdatedAt())
                .build();
    }

    private ComboResponse mapToResponse(Combo combo) {
        return mapToResponse(combo, 0, 0L);
    }

    public List<ComboResponse> getAllCombos() {
        List<Object[]> stats = bookingComboRepository.getComboRevenueStats();
        Map<UUID, Integer> soldMap = new HashMap<>();
        Map<UUID, Long> revenueMap = new HashMap<>();
        
        for (Object[] row : stats) {
            UUID comboId = (UUID) row[0];
            soldMap.put(comboId, ((Number) row[1]).intValue());
            revenueMap.put(comboId, ((Number) row[2]).longValue());
        }

        return comboRepository.findAll().stream()
                .map(combo -> mapToResponse(
                        combo, 
                        soldMap.getOrDefault(combo.getId(), 0), 
                        revenueMap.getOrDefault(combo.getId(), 0L)
                ))
                .collect(Collectors.toList());
    }

    public List<Map<String, Object>> getComboChartData(java.time.LocalDateTime startDate, java.time.LocalDateTime endDate) {
        List<Object[]> rawData = bookingComboRepository.getComboChartData(startDate, endDate);
        
        Map<String, Map<String, Object>> dateMap = new java.util.LinkedHashMap<>();
        
        for (Object[] row : rawData) {
            java.util.Date date = (java.util.Date) row[0];
            String dateStr = new java.text.SimpleDateFormat("dd/MM").format(date);
            String comboName = (String) row[1];
            Integer sold = ((Number) row[2]).intValue();
            Long revenue = ((Number) row[3]).longValue();
            
            Map<String, Object> dayData = dateMap.computeIfAbsent(dateStr, k -> {
                Map<String, Object> map = new HashMap<>();
                map.put("month", dateStr); // Recharts uses 'month' key in frontend
                map.put("revenue", 0L);
                return map;
            });
            
            dayData.put(comboName, revenue); // Changed from sold to revenue
            Long currentRevenue = (Long) dayData.get("revenue");
            dayData.put("revenue", currentRevenue + revenue);
        }
        
        return new java.util.ArrayList<>(dateMap.values());
    }

    public ComboResponse getComboById(UUID id) {
        Combo combo = comboRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy Combo với ID: " + id));
        return mapToResponse(combo);
    }

    @Transactional
    public ComboResponse createCombo(ComboCreateRequest request, org.springframework.web.multipart.MultipartFile imageFile) {
        String imageUrl = request.getImageUrl();
        if (imageFile != null && !imageFile.isEmpty()) {
            imageUrl = fileStorageService.storeFile(imageFile);
        }

        Combo combo = Combo.builder()
                .name(request.getName())
                .imageUrl(imageUrl)
                .description(request.getDescription())
                .price(request.getPrice())
                .status("IN_STOCK")
                .type("COMBO")
                .discountPercent(request.getDiscountPercent() != null ? request.getDiscountPercent() : 0)
                .discountStartDate(request.getDiscountStartDate())
                .discountEndDate(request.getDiscountEndDate())
                .isHidden(false)
                .build();
        Combo savedCombo = comboRepository.save(combo);

        // Bất đồng bộ gửi thông báo chuông cho người dùng khi tạo combo mới (không gửi email)
        java.util.concurrent.CompletableFuture.runAsync(() -> {
            try {
                List<com.Cinema.movie_backend.entity.User> allUsers = userRepository.findAll();
                String title = "Combo mới ra mắt: " + savedCombo.getName();
                String message = savedCombo.getDescription() != null && !savedCombo.getDescription().trim().isEmpty()
                        ? savedCombo.getDescription()
                        : ("Khám phá ngay combo " + savedCombo.getName() + " tại rạp!");
                String link = "/booking";

                for (com.Cinema.movie_backend.entity.User user : allUsers) {
                    boolean isAdmin = user.getRoles() != null && user.getRoles().stream()
                            .anyMatch(role -> role.getName().toUpperCase().contains("ADMIN"));
                    if (isAdmin) {
                        continue;
                    }
                    notificationService.sendNotification(
                            user,
                            title,
                            message,
                            link,
                            com.Cinema.movie_backend.entity.NotificationType.PROMOTION
                    );
                }
            } catch (Exception e) {
                System.err.println("Lỗi khi gửi thông báo combo: " + e.getMessage());
            }
        });

        return mapToResponse(savedCombo);
    }

    @Transactional
    public ComboResponse updateCombo(UUID id, ComboUpdateRequest request, org.springframework.web.multipart.MultipartFile imageFile) {
        Combo combo = comboRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy Combo với ID: " + id));

        if (imageFile != null && !imageFile.isEmpty()) {
            String imageUrl = fileStorageService.storeFile(imageFile);
            combo.setImageUrl(imageUrl);
        } else if (request.getImageUrl() != null && !request.getImageUrl().isEmpty()) {
            combo.setImageUrl(request.getImageUrl());
        }

        combo.setName(request.getName());
        combo.setDescription(request.getDescription());
        combo.setPrice(request.getPrice());
        if (request.getStatus() != null && !request.getStatus().isEmpty()) {
            combo.setStatus(request.getStatus());
        }
        combo.setDiscountPercent(request.getDiscountPercent());
        combo.setDiscountStartDate(request.getDiscountStartDate());
        combo.setDiscountEndDate(request.getDiscountEndDate());

        Combo updatedCombo = comboRepository.save(combo);
        return mapToResponse(updatedCombo);
    }

    @Transactional
    public ComboResponse toggleHide(UUID id) {
        Combo combo = comboRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy Combo với ID: " + id));
        Boolean currentHidden = combo.getIsHidden();
        boolean newHidden = currentHidden != null ? !currentHidden : true;
        combo.setIsHidden(newHidden);
        combo.setStatus(newHidden ? "OUT_OF_STOCK" : "IN_STOCK");
        Combo updatedCombo = comboRepository.save(combo);
        return mapToResponse(updatedCombo);
    }

    @Transactional
    public void deleteCombo(UUID id) {
        if (!comboRepository.existsById(id)) {
            throw new RuntimeException("Không tìm thấy Combo với ID: " + id);
        }
        comboRepository.deleteById(id);
    }
}
