package com.Cinema.movie_backend.controller;

import com.Cinema.movie_backend.entity.SystemConfig;
import com.Cinema.movie_backend.service.MembershipPolicyService;
import com.Cinema.movie_backend.service.SystemConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/system-configs")
@RequiredArgsConstructor
public class SystemConfigController {

    private final SystemConfigService systemConfigService;
    private final MembershipPolicyService membershipPolicyService;

    @GetMapping
    public ResponseEntity<List<SystemConfig>> getAllConfigs() {
        return ResponseEntity.ok(systemConfigService.getAllConfigs());
    }

    @PutMapping("/{key}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<SystemConfig> updateConfig(@PathVariable String key, @RequestBody Map<String, String> payload) {
        String value = payload.get("value");
        if (value == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(systemConfigService.updateConfig(key, value));
    }

    @PutMapping("/vip-thresholds")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<List<SystemConfig>> updateVipThresholds(@RequestBody Map<String, String> payload) {
        return ResponseEntity.ok(systemConfigService.updateVipThresholds(
                payload.get(SystemConfigService.KEY_VIP_1_MIN_POINTS),
                payload.get(SystemConfigService.KEY_VIP_2_MIN_POINTS),
                payload.get(SystemConfigService.KEY_VIP_3_MIN_POINTS)));
    }

    @PutMapping("/membership-policy")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<List<SystemConfig>> updateMembershipPolicy(@RequestBody Map<String, String> payload) {
        List<SystemConfig> savedConfigs = systemConfigService.updateMembershipPolicy(payload);
        membershipPolicyService.promoteEligibleUsers();
        return ResponseEntity.ok(savedConfigs);
    }
}
