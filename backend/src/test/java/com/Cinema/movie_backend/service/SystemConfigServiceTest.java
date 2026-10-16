package com.Cinema.movie_backend.service;

import com.Cinema.movie_backend.entity.SystemConfig;
import com.Cinema.movie_backend.repository.OnlineMoviePriceRepository;
import com.Cinema.movie_backend.repository.OnlineTicketRepository;
import com.Cinema.movie_backend.repository.SystemConfigRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SystemConfigServiceTest {

    @Mock
    private SystemConfigRepository systemConfigRepository;

    @Mock
    private OnlineTicketRepository onlineTicketRepository;

    @Mock
    private OnlineMoviePriceRepository onlineMoviePriceRepository;

    @InjectMocks
    private SystemConfigService service;

    @Test
    void initializesDefaultVipThresholds() {
        when(systemConfigRepository.findByKey(any())).thenReturn(Optional.empty());

        service.initDefaultConfigs();

        ArgumentCaptor<SystemConfig> captor = ArgumentCaptor.forClass(SystemConfig.class);
        verify(systemConfigRepository, times(13)).save(captor.capture());

        assertEquals("2000", valueOf(captor.getAllValues(), SystemConfigService.KEY_VIP_1_MIN_POINTS));
        assertEquals("4000", valueOf(captor.getAllValues(), SystemConfigService.KEY_VIP_2_MIN_POINTS));
        assertEquals("8000", valueOf(captor.getAllValues(), SystemConfigService.KEY_VIP_3_MIN_POINTS));
    }

    @Test
    void updatesAllVipThresholdsAtomicallyWhenTheyAreValid() {
        List<SystemConfig> configs = defaultVipConfigs();
        when(systemConfigRepository.findAllByKeyInForUpdate(any())).thenReturn(configs);
        when(systemConfigRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        List<SystemConfig> updated = service.updateVipThresholds("2500", "5000", "9000");

        assertEquals("2500", valueOf(updated, SystemConfigService.KEY_VIP_1_MIN_POINTS));
        assertEquals("5000", valueOf(updated, SystemConfigService.KEY_VIP_2_MIN_POINTS));
        assertEquals("9000", valueOf(updated, SystemConfigService.KEY_VIP_3_MIN_POINTS));
        verify(systemConfigRepository).saveAll(any());
    }

    @Test
    void rejectsNonAscendingVipThresholdsWithoutWriting() {
        IllegalArgumentException error = assertThrows(
                IllegalArgumentException.class,
                () -> service.updateVipThresholds("2000", "2000", "8000"));

        assertEquals("Ngưỡng điểm VIP phải tăng dần: VIP 1 < VIP 2 < VIP 3", error.getMessage());
        verify(systemConfigRepository, never()).saveAll(any());
    }

    @Test
    void rejectsNonPositiveVipThresholdWithoutWriting() {
        assertThrows(
                IllegalArgumentException.class,
                () -> service.updateVipThresholds("-1", "4000", "8000"));
        assertThrows(
                IllegalArgumentException.class,
                () -> service.updateVipThresholds("0", "4000", "8000"));

        verify(systemConfigRepository, never()).saveAll(any());
    }

    @Test
    void individualVipUpdateValidatesAgainstLockedThresholds() {
        when(systemConfigRepository.findAllByKeyInForUpdate(any())).thenReturn(defaultVipConfigs());

        assertThrows(
                IllegalArgumentException.class,
                () -> service.updateConfig(SystemConfigService.KEY_VIP_1_MIN_POINTS, "4500"));

        verify(systemConfigRepository, never()).save(any());
    }

    private static List<SystemConfig> defaultVipConfigs() {
        return List.of(
                config(SystemConfigService.KEY_VIP_1_MIN_POINTS, "2000"),
                config(SystemConfigService.KEY_VIP_2_MIN_POINTS, "4000"),
                config(SystemConfigService.KEY_VIP_3_MIN_POINTS, "8000"));
    }

    private static SystemConfig config(String key, String value) {
        return SystemConfig.builder().key(key).value(value).build();
    }

    private static String valueOf(List<SystemConfig> configs, String key) {
        return configs.stream()
                .filter(config -> key.equals(config.getKey()))
                .findFirst()
                .orElseThrow()
                .getValue();
    }
}
