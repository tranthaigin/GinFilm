package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.entity.SystemConfig;
import com.Cinema.movie_backend.repository.SystemConfigRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SystemConfigService {

    private final SystemConfigRepository systemConfigRepository;
    private final com.Cinema.movie_backend.repository.OnlineTicketRepository onlineTicketRepository;
    private final com.Cinema.movie_backend.repository.OnlineMoviePriceRepository onlineMoviePriceRepository;

    public static final String KEY_MIN_RLF_POINTS = "MIN_RLF_POINTS";
    public static final String KEY_MIN_CASH_VND = "MIN_CASH_VND";
    public static final String KEY_DEFAULT_VOD_BUFFER_MINUTES = "DEFAULT_VOD_BUFFER_MINUTES";
    public static final String KEY_VIP_1_MIN_POINTS = "VIP_1_MIN_POINTS";
    public static final String KEY_VIP_2_MIN_POINTS = "VIP_2_MIN_POINTS";
    public static final String KEY_VIP_3_MIN_POINTS = "VIP_3_MIN_POINTS";
    public static final String KEY_VIP_REVIEW_PERIOD_MONTHS = "VIP_REVIEW_PERIOD_MONTHS";
    public static final String KEY_VIP_1_REQUIRED_EARNED_POINTS = "VIP_1_REQUIRED_EARNED_POINTS";
    public static final String KEY_VIP_2_REQUIRED_EARNED_POINTS = "VIP_2_REQUIRED_EARNED_POINTS";
    public static final String KEY_VIP_3_REQUIRED_EARNED_POINTS = "VIP_3_REQUIRED_EARNED_POINTS";
    public static final String KEY_VIP_1_PENALTY_POINTS = "VIP_1_PENALTY_POINTS";
    public static final String KEY_VIP_2_PENALTY_POINTS = "VIP_2_PENALTY_POINTS";
    public static final String KEY_VIP_3_PENALTY_POINTS = "VIP_3_PENALTY_POINTS";
    public static final String KEY_VIP_MEMBERSHIP_STATE_VERSION = "VIP_MEMBERSHIP_STATE_VERSION";

    private static final int DEFAULT_VIP_1_MIN_POINTS = 2_000;
    private static final int DEFAULT_VIP_2_MIN_POINTS = 4_000;
    private static final int DEFAULT_VIP_3_MIN_POINTS = 8_000;
    private static final int DEFAULT_VIP_REVIEW_PERIOD_MONTHS = 3;
    private static final List<String> VIP_THRESHOLD_KEYS = List.of(
            KEY_VIP_1_MIN_POINTS,
            KEY_VIP_2_MIN_POINTS,
            KEY_VIP_3_MIN_POINTS);
    private static final Set<String> VIP_THRESHOLD_KEY_SET = Set.copyOf(VIP_THRESHOLD_KEYS);
    private static final List<String> MEMBERSHIP_POLICY_KEYS = List.of(
            KEY_VIP_1_MIN_POINTS,
            KEY_VIP_2_MIN_POINTS,
            KEY_VIP_3_MIN_POINTS,
            KEY_VIP_REVIEW_PERIOD_MONTHS,
            KEY_VIP_1_REQUIRED_EARNED_POINTS,
            KEY_VIP_2_REQUIRED_EARNED_POINTS,
            KEY_VIP_3_REQUIRED_EARNED_POINTS,
            KEY_VIP_1_PENALTY_POINTS,
            KEY_VIP_2_PENALTY_POINTS,
            KEY_VIP_3_PENALTY_POINTS);

    @PostConstruct
    @Transactional
    public void initDefaultConfigs() {
        if (systemConfigRepository.findByKey(KEY_MIN_RLF_POINTS).isEmpty()) {
            systemConfigRepository.save(SystemConfig.builder()
                    .key(KEY_MIN_RLF_POINTS)
                    .value("10")
                    .description("Số điểm GinFilm tối thiểu cần sử dụng cho mỗi lần thanh toán")
                    .build());
        }

        if (systemConfigRepository.findByKey(KEY_MIN_CASH_VND).isEmpty()) {
            systemConfigRepository.save(SystemConfig.builder()
                    .key(KEY_MIN_CASH_VND)
                    .value("7000")
                    .description("Số tiền mặt tối thiểu bắt buộc phải thanh toán cho hạng mục vé")
                    .build());
        }

        if (systemConfigRepository.findByKey(KEY_DEFAULT_VOD_BUFFER_MINUTES).isEmpty()) {
            systemConfigRepository.save(SystemConfig.builder()
                    .key(KEY_DEFAULT_VOD_BUFFER_MINUTES)
                    .value("60")
                    .description("Số phút bù giờ mặc định cộng thêm vào thời lượng phim cho vé xem trực tuyến (VOD)")
                    .build());
        }

        createConfigIfMissing(
                KEY_VIP_1_MIN_POINTS,
                DEFAULT_VIP_1_MIN_POINTS,
                "Số điểm thành viên tối thiểu để đạt hạng VIP 1");
        createConfigIfMissing(
                KEY_VIP_2_MIN_POINTS,
                DEFAULT_VIP_2_MIN_POINTS,
                "Số điểm thành viên tối thiểu để đạt hạng VIP 2");
        createConfigIfMissing(
                KEY_VIP_3_MIN_POINTS,
                DEFAULT_VIP_3_MIN_POINTS,
                "Số điểm thành viên tối thiểu để đạt hạng VIP 3");
        createConfigIfMissing(KEY_VIP_REVIEW_PERIOD_MONTHS, DEFAULT_VIP_REVIEW_PERIOD_MONTHS,
                "Số tháng của một kỳ duy trì hạng VIP");
        createConfigIfMissing(KEY_VIP_1_REQUIRED_EARNED_POINTS, 300,
                "Điểm thành viên VIP 1 cần phát sinh trong một kỳ");
        createConfigIfMissing(KEY_VIP_2_REQUIRED_EARNED_POINTS, 500,
                "Điểm thành viên VIP 2 cần phát sinh trong một kỳ");
        createConfigIfMissing(KEY_VIP_3_REQUIRED_EARNED_POINTS, 1_000,
                "Điểm thành viên VIP 3 cần phát sinh trong một kỳ");
        createConfigIfMissing(KEY_VIP_1_PENALTY_POINTS, 600,
                "Điểm thành viên bị trừ khi VIP 1 không đạt yêu cầu trong kỳ");
        createConfigIfMissing(KEY_VIP_2_PENALTY_POINTS, 1_000,
                "Điểm thành viên bị trừ khi VIP 2 không đạt yêu cầu trong kỳ");
        createConfigIfMissing(KEY_VIP_3_PENALTY_POINTS, 2_000,
                "Điểm thành viên bị trừ khi VIP 3 không đạt yêu cầu trong kỳ");
    }

    private void createConfigIfMissing(String key, int value, String description) {
        if (systemConfigRepository.findByKey(key).isEmpty()) {
            systemConfigRepository.save(SystemConfig.builder()
                    .key(key)
                    .value(String.valueOf(value))
                    .description(description)
                    .build());
        }
    }

    public int getMinRlfPoints() {
        return systemConfigRepository.findByKey(KEY_MIN_RLF_POINTS)
                .map(config -> Integer.parseInt(config.getValue()))
                .orElse(10);
    }

    public int getMinCashVnd() {
        return systemConfigRepository.findByKey(KEY_MIN_CASH_VND)
                .map(config -> Integer.parseInt(config.getValue()))
                .orElse(7000);
    }

    public int getDefaultVodBufferMinutes() {
        return systemConfigRepository.findByKey(KEY_DEFAULT_VOD_BUFFER_MINUTES)
                .map(config -> Integer.parseInt(config.getValue()))
                .orElse(60);
    }

    public List<SystemConfig> getAllConfigs() {
        return systemConfigRepository.findAll();
    }

    public MembershipPolicy getMembershipPolicy() {
        Map<String, SystemConfig> configs = systemConfigRepository.findAll().stream()
                .filter(config -> MEMBERSHIP_POLICY_KEYS.contains(config.getKey()))
                .collect(Collectors.toMap(SystemConfig::getKey, Function.identity()));
        return membershipPolicyFrom(configs);
    }

    @Transactional
    public SystemConfig updateConfig(String key, String value) {
        if (VIP_THRESHOLD_KEY_SET.contains(key)) {
            return updateSingleVipThreshold(key, value);
        }

        Optional<SystemConfig> configOpt = systemConfigRepository.findByKey(key);
        if (configOpt.isPresent()) {
            SystemConfig config = configOpt.get();
            config.setValue(value);
            SystemConfig saved = systemConfigRepository.save(config);

            if (KEY_DEFAULT_VOD_BUFFER_MINUTES.equals(key)) {
                try {
                    int newBuffer = Integer.parseInt(value);

                    // Đồng bộ các vé chưa kích hoạt (activatedAt == null)
                    List<com.Cinema.movie_backend.entity.OnlineTicket> unactivatedTickets = onlineTicketRepository.findByActivatedAtIsNull();
                    for (com.Cinema.movie_backend.entity.OnlineTicket t : unactivatedTickets) {
                        if (t.getMovie() != null) {
                            int dur = (t.getMovie().getDuration() != null && t.getMovie().getDuration() > 0) ? t.getMovie().getDuration() : 120;
                            t.setTimeLimitMinutes(dur + newBuffer);
                            onlineTicketRepository.save(t);
                        }
                    }

                    // Đồng bộ bảng online_movie_prices cho các phim chưa set custom validity
                    List<com.Cinema.movie_backend.entity.OnlineMoviePrice> prices = onlineMoviePriceRepository.findAll();
                    for (com.Cinema.movie_backend.entity.OnlineMoviePrice p : prices) {
                        if (p.getMovie() != null) {
                            int dur = (p.getMovie().getDuration() != null && p.getMovie().getDuration() > 0) ? p.getMovie().getDuration() : 120;
                            p.setValidityPeriodMinutes(dur + newBuffer);
                            onlineMoviePriceRepository.save(p);
                        }
                    }
                } catch (Exception e) {
                    // Ignore parse errors
                }
            }

            return saved;
        } else {
            throw new IllegalArgumentException("Không tìm thấy cấu hình với key: " + key);
        }
    }

    @Transactional
    public List<SystemConfig> updateVipThresholds(String vip1Value, String vip2Value, String vip3Value) {
        int vip1 = parsePositiveThreshold(KEY_VIP_1_MIN_POINTS, vip1Value);
        int vip2 = parsePositiveThreshold(KEY_VIP_2_MIN_POINTS, vip2Value);
        int vip3 = parsePositiveThreshold(KEY_VIP_3_MIN_POINTS, vip3Value);
        validateVipThresholdOrder(vip1, vip2, vip3);

        Map<String, SystemConfig> configs = lockVipThresholdConfigs();
        configs.get(KEY_VIP_1_MIN_POINTS).setValue(String.valueOf(vip1));
        configs.get(KEY_VIP_2_MIN_POINTS).setValue(String.valueOf(vip2));
        configs.get(KEY_VIP_3_MIN_POINTS).setValue(String.valueOf(vip3));

        return systemConfigRepository.saveAll(VIP_THRESHOLD_KEYS.stream()
                .map(configs::get)
                .toList());
    }

    @Transactional
    public List<SystemConfig> updateMembershipPolicy(Map<String, String> values) {
        int vip1 = parsePositiveThreshold(KEY_VIP_1_MIN_POINTS, values.get(KEY_VIP_1_MIN_POINTS));
        int vip2 = parsePositiveThreshold(KEY_VIP_2_MIN_POINTS, values.get(KEY_VIP_2_MIN_POINTS));
        int vip3 = parsePositiveThreshold(KEY_VIP_3_MIN_POINTS, values.get(KEY_VIP_3_MIN_POINTS));
        validateVipThresholdOrder(vip1, vip2, vip3);

        int reviewMonths = parsePositiveThreshold(
                KEY_VIP_REVIEW_PERIOD_MONTHS,
                values.get(KEY_VIP_REVIEW_PERIOD_MONTHS));
        if (reviewMonths > 120) {
            throw new IllegalArgumentException("Kỳ xét hạng VIP không được vượt quá 120 tháng");
        }

        Map<String, Integer> parsed = Map.of(
                KEY_VIP_1_MIN_POINTS, vip1,
                KEY_VIP_2_MIN_POINTS, vip2,
                KEY_VIP_3_MIN_POINTS, vip3,
                KEY_VIP_REVIEW_PERIOD_MONTHS, reviewMonths,
                KEY_VIP_1_REQUIRED_EARNED_POINTS, parseNonNegativePolicyValue(KEY_VIP_1_REQUIRED_EARNED_POINTS, values.get(KEY_VIP_1_REQUIRED_EARNED_POINTS)),
                KEY_VIP_2_REQUIRED_EARNED_POINTS, parseNonNegativePolicyValue(KEY_VIP_2_REQUIRED_EARNED_POINTS, values.get(KEY_VIP_2_REQUIRED_EARNED_POINTS)),
                KEY_VIP_3_REQUIRED_EARNED_POINTS, parseNonNegativePolicyValue(KEY_VIP_3_REQUIRED_EARNED_POINTS, values.get(KEY_VIP_3_REQUIRED_EARNED_POINTS)),
                KEY_VIP_1_PENALTY_POINTS, parseNonNegativePolicyValue(KEY_VIP_1_PENALTY_POINTS, values.get(KEY_VIP_1_PENALTY_POINTS)),
                KEY_VIP_2_PENALTY_POINTS, parseNonNegativePolicyValue(KEY_VIP_2_PENALTY_POINTS, values.get(KEY_VIP_2_PENALTY_POINTS)),
                KEY_VIP_3_PENALTY_POINTS, parseNonNegativePolicyValue(KEY_VIP_3_PENALTY_POINTS, values.get(KEY_VIP_3_PENALTY_POINTS)));

        Map<String, SystemConfig> configs = lockConfigs(MEMBERSHIP_POLICY_KEYS);
        MEMBERSHIP_POLICY_KEYS.forEach(key -> configs.get(key).setValue(String.valueOf(parsed.get(key))));
        return systemConfigRepository.saveAll(MEMBERSHIP_POLICY_KEYS.stream().map(configs::get).toList());
    }

    private SystemConfig updateSingleVipThreshold(String key, String value) {
        int newValue = parsePositiveThreshold(key, value);
        Map<String, SystemConfig> configs = lockVipThresholdConfigs();

        int vip1 = thresholdValue(configs, KEY_VIP_1_MIN_POINTS);
        int vip2 = thresholdValue(configs, KEY_VIP_2_MIN_POINTS);
        int vip3 = thresholdValue(configs, KEY_VIP_3_MIN_POINTS);

        if (KEY_VIP_1_MIN_POINTS.equals(key)) {
            vip1 = newValue;
        } else if (KEY_VIP_2_MIN_POINTS.equals(key)) {
            vip2 = newValue;
        } else {
            vip3 = newValue;
        }
        validateVipThresholdOrder(vip1, vip2, vip3);

        SystemConfig config = configs.get(key);
        config.setValue(String.valueOf(newValue));
        return systemConfigRepository.save(config);
    }

    private Map<String, SystemConfig> lockVipThresholdConfigs() {
        return lockConfigs(VIP_THRESHOLD_KEYS);
    }

    private Map<String, SystemConfig> lockConfigs(List<String> keys) {
        Map<String, SystemConfig> configs = systemConfigRepository
                .findAllByKeyInForUpdate(keys)
                .stream()
                .collect(Collectors.toMap(SystemConfig::getKey, Function.identity()));

        for (String key : keys) {
            if (!configs.containsKey(key)) {
                throw new IllegalArgumentException("Không tìm thấy cấu hình với key: " + key);
            }
        }
        return configs;
    }

    private int thresholdValue(Map<String, SystemConfig> configs, String key) {
        return parsePositiveThreshold(key, configs.get(key).getValue());
    }

    private int parsePositiveThreshold(String key, String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(key + " không được để trống");
        }

        try {
            int parsed = Integer.parseInt(value.trim());
            if (parsed <= 0) {
                throw new IllegalArgumentException(key + " phải là số nguyên lớn hơn 0");
            }
            return parsed;
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException(key + " phải là số nguyên hợp lệ");
        }
    }

    private int parseNonNegativePolicyValue(String key, String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(key + " không được để trống");
        }
        try {
            int parsed = Integer.parseInt(value.trim());
            if (parsed < 0) {
                throw new IllegalArgumentException(key + " phải là số nguyên không âm");
            }
            return parsed;
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException(key + " phải là số nguyên hợp lệ");
        }
    }

    private MembershipPolicy membershipPolicyFrom(Map<String, SystemConfig> configs) {
        return new MembershipPolicy(
                configValue(configs, KEY_VIP_1_MIN_POINTS, DEFAULT_VIP_1_MIN_POINTS),
                configValue(configs, KEY_VIP_2_MIN_POINTS, DEFAULT_VIP_2_MIN_POINTS),
                configValue(configs, KEY_VIP_3_MIN_POINTS, DEFAULT_VIP_3_MIN_POINTS),
                configValue(configs, KEY_VIP_REVIEW_PERIOD_MONTHS, DEFAULT_VIP_REVIEW_PERIOD_MONTHS),
                new int[] {
                        0,
                        configValue(configs, KEY_VIP_1_REQUIRED_EARNED_POINTS, 300),
                        configValue(configs, KEY_VIP_2_REQUIRED_EARNED_POINTS, 500),
                        configValue(configs, KEY_VIP_3_REQUIRED_EARNED_POINTS, 1_000)
                },
                new int[] {
                        0,
                        configValue(configs, KEY_VIP_1_PENALTY_POINTS, 600),
                        configValue(configs, KEY_VIP_2_PENALTY_POINTS, 1_000),
                        configValue(configs, KEY_VIP_3_PENALTY_POINTS, 2_000)
                });
    }

    private int configValue(Map<String, SystemConfig> configs, String key, int fallback) {
        SystemConfig config = configs.get(key);
        if (config == null) {
            return fallback;
        }
        try {
            return Integer.parseInt(config.getValue());
        } catch (NumberFormatException exception) {
            return fallback;
        }
    }

    private void validateVipThresholdOrder(int vip1, int vip2, int vip3) {
        if (!(vip1 < vip2 && vip2 < vip3)) {
            throw new IllegalArgumentException(
                    "Ngưỡng điểm VIP phải tăng dần: VIP 1 < VIP 2 < VIP 3");
        }
    }

    public record MembershipPolicy(
            int vip1MinPoints,
            int vip2MinPoints,
            int vip3MinPoints,
            int reviewPeriodMonths,
            int[] requiredEarnedPoints,
            int[] penaltyPoints) {

        public int tierForPoints(int points) {
            if (points >= vip3MinPoints) return 3;
            if (points >= vip2MinPoints) return 2;
            if (points >= vip1MinPoints) return 1;
            return 0;
        }

        public int requiredEarnedPointsFor(int tier) {
            return requiredEarnedPoints[Math.max(0, Math.min(3, tier))];
        }

        public int penaltyPointsFor(int tier) {
            return penaltyPoints[Math.max(0, Math.min(3, tier))];
        }
    }
}
