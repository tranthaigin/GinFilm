package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.DTO.PromotionRequest;
import com.Cinema.movie_backend.entity.Promotion;
import com.Cinema.movie_backend.repository.PromotionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

@Service
public class PromotionService {

    @Autowired
    private PromotionRepository promotionRepository;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private com.Cinema.movie_backend.repository.UserRepository userRepository;

    @Autowired
    private com.Cinema.movie_backend.repository.BookingRepository bookingRepository;

    @Autowired private com.Cinema.movie_backend.repository.OnlineTicketRepository onlineTicketRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private EmailService emailService;

    private LocalDate parseDateSafe(String dateStr) {
        if (dateStr == null || dateStr.trim().isEmpty()) return null;
        String s = dateStr.trim();
        if (s.contains("T")) s = s.split("T")[0];
        return LocalDate.parse(s);
    }

    private void validatePromotionRequest(PromotionRequest request) {
        if (request.getDiscount() == null || request.getDiscount() <= 0
                || (request.getMinOrderValue() != null && (!Double.isFinite(request.getMinOrderValue()) || request.getMinOrderValue() < 0))
                || (request.getMaxDiscount() != null && (!Double.isFinite(request.getMaxDiscount()) || request.getMaxDiscount() < 0))
                || (request.getUsageLimitPerUser() != null && request.getUsageLimitPerUser() < 0)) {
            throw new IllegalArgumentException("Thông số khuyến mãi không hợp lệ");
        }
        if (request.getDiscountType() != null) com.Cinema.movie_backend.enums.DiscountType.valueOf(request.getDiscountType());
        if (request.getScope() != null) com.Cinema.movie_backend.enums.PromotionScope.valueOf(request.getScope());
        LocalDate start = parseDateSafe(request.getStartDate());
        LocalDate end = parseDateSafe(request.getEnd());
        if (start != null && end != null && end.isBefore(start)) throw new IllegalArgumentException("Ngày kết thúc phải sau ngày bắt đầu");
        if (request.getDiscountType() != null && request.getDiscountType().equals("PERCENTAGE")
                && request.getDiscount() != null && request.getDiscount() > 100) {
            throw new RuntimeException("Mức giảm theo phần trăm không được vượt quá 100%.");
        }
        if (request.getMaxDiscount() != null && request.getMaxDiscount() > 50000000.0) {
            throw new RuntimeException("Giảm tối đa không được vượt quá 50.000.000 VNĐ.");
        }
        if (request.getMinOrderValue() != null && request.getMinOrderValue() > 100000000.0) {
            throw new RuntimeException("Điều kiện tối thiểu không được vượt quá 100.000.000 VNĐ.");
        }
        if (request.getDescription() != null && !request.getDescription().equals(request.getDescription().trim())) {
            throw new RuntimeException("Nội dung chi tiết không được có khoảng trắng ở đầu hoặc cuối.");
        }
    }

    public List<Promotion> getAllPromotions() {
        return promotionRepository.findAll(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "id"));
    }

    public List<Promotion> getVisiblePromotions() {
        return promotionRepository.findVisiblePromotions(LocalDate.now());
    }

    public Promotion getPromotionById(Long id) {
        return promotionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chương trình ưu đãi với ID: " + id));
    }

    @Transactional
    public Promotion createPromotion(PromotionRequest request, MultipartFile imageFile) {
        validatePromotionRequest(request);
        String imageUrl = null;
        if (imageFile != null && !imageFile.isEmpty()) {
            String contentType = imageFile.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                throw new RuntimeException("Chỉ chấp nhận file định dạng ảnh (JPEG, PNG, WEBP, GIF).");
            }
            imageUrl = fileStorageService.storeFile(imageFile);
        }

        LocalDate startDate = parseDateSafe(request.getStartDate());
        LocalDate end = parseDateSafe(request.getEnd());

        com.Cinema.movie_backend.enums.DiscountType dType = null;
        if (request.getDiscountType() != null) {
            try { dType = com.Cinema.movie_backend.enums.DiscountType.valueOf(request.getDiscountType()); } catch (Exception e) {}
        }
        com.Cinema.movie_backend.enums.PromotionScope scope = null;
        if (request.getScope() != null) {
            try { scope = com.Cinema.movie_backend.enums.PromotionScope.valueOf(request.getScope()); } catch (Exception e) {}
        }

        Promotion promotion = Promotion.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .code(request.getCode())
                .discount(request.getDiscount())
                .discountType(dType)
                .scope(scope)
                .maxDiscount(request.getMaxDiscount())
                .minOrderValue(request.getMinOrderValue() != null ? request.getMinOrderValue() : 0.0)
                .startDate(startDate)
                .end(end)
                .usageLimitPerUser(request.getUsageLimitPerUser())
                .imageUrl(imageUrl)
                .isHidden(false)
                .build();

        Promotion savedPromotion = promotionRepository.save(promotion);

        // Bất đồng bộ gửi thông báo cho tất cả người dùng
        java.util.concurrent.CompletableFuture.runAsync(() -> {
            try {
                List<com.Cinema.movie_backend.entity.User> allUsers = userRepository.findAll();
                String title = "Khuyến mãi mới: " + savedPromotion.getTitle();
                String message = savedPromotion.getDescription();
                String link = "/promotions/" + savedPromotion.getId();

                for (com.Cinema.movie_backend.entity.User user : allUsers) {
                    boolean isAdmin = user.getRoles() != null && user.getRoles().stream()
                            .anyMatch(role -> role.getName().toUpperCase().contains("ADMIN"));
                    
                    if (isAdmin) {
                        continue; // Không gửi thông báo cho Admin
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
                System.err.println("Lỗi khi gửi thông báo khuyến mãi: " + e.getMessage());
            }
        });

        return savedPromotion;
    }

    @Transactional
    public Promotion updatePromotion(Long id, PromotionRequest request, MultipartFile imageFile) {
        Promotion promotion = promotionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chương trình ưu đãi"));

        validatePromotionRequest(request);

        if (imageFile != null && !imageFile.isEmpty()) {
            String contentType = imageFile.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                throw new RuntimeException("Chỉ chấp nhận file định dạng ảnh (JPEG, PNG, WEBP, GIF).");
            }
            String imageUrl = fileStorageService.storeFile(imageFile);
            promotion.setImageUrl(imageUrl);
        }

        LocalDate startDate = parseDateSafe(request.getStartDate());
        LocalDate end = parseDateSafe(request.getEnd());

        com.Cinema.movie_backend.enums.DiscountType dType = null;
        if (request.getDiscountType() != null) {
            try { dType = com.Cinema.movie_backend.enums.DiscountType.valueOf(request.getDiscountType()); } catch (Exception e) {}
        }
        com.Cinema.movie_backend.enums.PromotionScope scope = null;
        if (request.getScope() != null) {
            try { scope = com.Cinema.movie_backend.enums.PromotionScope.valueOf(request.getScope()); } catch (Exception e) {}
        }

        promotion.setTitle(request.getTitle());
        promotion.setDescription(request.getDescription());
        promotion.setCode(request.getCode());
        promotion.setDiscount(request.getDiscount());
        promotion.setDiscountType(dType);
        promotion.setScope(scope);
        promotion.setMaxDiscount(request.getMaxDiscount());
        promotion.setMinOrderValue(request.getMinOrderValue() != null ? request.getMinOrderValue() : 0.0);
        promotion.setUsageLimitPerUser(request.getUsageLimitPerUser());
        promotion.setStartDate(startDate);
        promotion.setEnd(end);

        return promotionRepository.save(promotion);
    }

    @Transactional
    public Promotion togglePromotionVisibility(Long id) {
        Promotion promotion = promotionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chương trình ưu đãi"));
        Boolean currentHidden = promotion.getIsHidden();
        promotion.setIsHidden(currentHidden != null ? !currentHidden : true);
        return promotionRepository.save(promotion);
    }

    public Promotion getPromotionByCode(String code) {
        return promotionRepository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy mã khuyến mãi: " + code));
    }

    public double applyPromotion(String code, double ticketTotal, double comboTotal, java.util.UUID userId) {
        Promotion promotion = getPromotionByCode(code);
        
        // Kiểm tra hiệu lực
        if (promotion.getIsHidden() != null && promotion.getIsHidden()) {
            throw new RuntimeException("Mã khuyến mãi không hợp lệ hoặc đã bị khoá.");
        }
        LocalDate today = LocalDate.now();
        if (promotion.getStartDate() != null && promotion.getStartDate().isAfter(today)) {
            throw new RuntimeException("Mã khuyến mãi chưa tới ngày áp dụng.");
        }
        if (promotion.getEnd() != null && promotion.getEnd().isBefore(today)) {
            throw new RuntimeException("Mã khuyến mãi đã hết hạn.");
        }
        
        if (promotion.getUsageLimitPerUser() != null && promotion.getUsageLimitPerUser() > 0 && userId != null) {
            int usedCount = bookingRepository.countByPromotionIdAndUserIdAndStatusNot(
                    promotion.getId(), userId, com.Cinema.movie_backend.enums.BookingStatus.CANCELLED);
            usedCount += onlineTicketRepository.countPromotionReservations(userId, promotion.getCode());
            if (usedCount >= promotion.getUsageLimitPerUser()) {
                throw new RuntimeException("Bạn đã vượt quá số lần sử dụng mã này (Tối đa " + promotion.getUsageLimitPerUser() + " lần).");
            }
        }

        // Kiểm tra điều kiện Giá trị tối thiểu dựa theo Phạm vi áp dụng (Scope)
        if (promotion.getMinOrderValue() != null && promotion.getMinOrderValue() > 0) {
            double applicableAmount = 0.0;
            String scopeName = "đơn hàng (Vé + Bắp nước)";
            if (promotion.getScope() == com.Cinema.movie_backend.enums.PromotionScope.TICKET_ONLY) {
                applicableAmount = ticketTotal;
                scopeName = "tiền VÉ";
            } else if (promotion.getScope() == com.Cinema.movie_backend.enums.PromotionScope.COMBO_ONLY) {
                applicableAmount = comboTotal;
                scopeName = "tiền BẮP NƯỚC";
            } else {
                applicableAmount = ticketTotal + comboTotal;
                scopeName = "tổng đơn hàng (Vé + Bắp nước)";
            }

            if (applicableAmount < promotion.getMinOrderValue()) {
                throw new RuntimeException("Mã khuyến mãi này yêu cầu " + scopeName + " từ " +
                        String.format("%,.0f", promotion.getMinOrderValue()) + "đ trở lên.");
            }
        }

        return calculateDiscountAmount(promotion, ticketTotal, comboTotal);
    }

    public double calculateDiscountAmount(Promotion promo, double ticketTotal, double comboTotal) {
        double applicableTotal = 0.0;
        
        if (promo.getScope() == null || promo.getScope() == com.Cinema.movie_backend.enums.PromotionScope.ALL) {
            if (ticketTotal + comboTotal <= 0) {
                throw new RuntimeException("Đơn hàng chưa có sản phẩm nào để áp dụng mã khuyến mãi.");
            }
            applicableTotal = ticketTotal + comboTotal;
        } else if (promo.getScope() == com.Cinema.movie_backend.enums.PromotionScope.TICKET_ONLY) {
            if (ticketTotal <= 0) {
                throw new RuntimeException("Mã khuyến mãi này chỉ áp dụng cho giao dịch mua vé xem phim.");
            }
            applicableTotal = ticketTotal;
        } else if (promo.getScope() == com.Cinema.movie_backend.enums.PromotionScope.COMBO_ONLY) {
            if (comboTotal <= 0) {
                throw new RuntimeException("Mã khuyến mãi này chỉ áp dụng cho giao dịch mua bắp nước.");
            }
            applicableTotal = comboTotal;
        }

        if (applicableTotal <= 0) {
            return 0.0;
        }

        double discountAmount = 0.0;
        if (promo.getDiscountType() == null || promo.getDiscountType() == com.Cinema.movie_backend.enums.DiscountType.FIXED_AMOUNT) {
            discountAmount = promo.getDiscount() != null ? promo.getDiscount().doubleValue() : 0.0;
        } else if (promo.getDiscountType() == com.Cinema.movie_backend.enums.DiscountType.PERCENTAGE) {
            double percent = promo.getDiscount() != null ? promo.getDiscount().doubleValue() : 0.0;
            discountAmount = applicableTotal * (percent / 100.0);
            
            if (promo.getMaxDiscount() != null && promo.getMaxDiscount() > 0) {
                discountAmount = Math.min(discountAmount, promo.getMaxDiscount());
            }
        }
        
        // Đảm bảo không giảm quá tổng tiền được áp dụng
        return Math.floor(Math.max(0, Math.min(discountAmount, applicableTotal)));
    }
}
