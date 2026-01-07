package com.pomodify.backend.presentation.controller;

import com.pomodify.backend.application.service.ActivityService;
import com.pomodify.backend.application.service.SessionService;
import com.pomodify.backend.application.service.SettingsService;
import com.pomodify.backend.presentation.dto.settings.UpdateSettingsRequest;
import com.pomodify.backend.presentation.dto.settings.UserSettingsResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/settings")
@RequiredArgsConstructor
@Slf4j
public class SettingsController {

    private final SettingsService settingsService;
    private final SessionService sessionService;
    private final ActivityService activityService;

    @GetMapping
    public ResponseEntity<UserSettingsResponse> getSettings(@AuthenticationPrincipal Jwt jwt) {
        Long userId = jwt.getClaim("user");
        return ResponseEntity.ok(settingsService.getSettings(userId));
    }

    @PatchMapping
    public ResponseEntity<UserSettingsResponse> updateSettings(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody UpdateSettingsRequest request) {
        Long userId = jwt.getClaim("user");
        return ResponseEntity.ok(settingsService.updateSettings(userId, request));
    }

    @DeleteMapping("/sessions/clear")
    public ResponseEntity<Map<String, String>> clearSessionHistory(@AuthenticationPrincipal Jwt jwt) {
        Long userId = jwt.getClaim("user");
        log.info("Clearing session history for user {}", userId);
        sessionService.clearAllSessions(userId);
        return ResponseEntity.ok(Map.of("message", "Session history cleared successfully"));
    }

    @DeleteMapping("/activities/clear")
    public ResponseEntity<Map<String, String>> clearActivityData(@AuthenticationPrincipal Jwt jwt) {
        Long userId = jwt.getClaim("user");
        log.info("Clearing activity data for user {}", userId);
        // First clear all sessions (they depend on activities)
        sessionService.clearAllSessions(userId);
        // Then clear all activities
        activityService.clearAllActivities(userId);
        return ResponseEntity.ok(Map.of("message", "Activity data cleared successfully"));
    }
}