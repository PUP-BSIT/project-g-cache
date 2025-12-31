package com.pomodify.backend.presentation.controller;

import com.pomodify.backend.application.service.ScheduledPushService;
import com.pomodify.backend.domain.model.ScheduledPushNotification;
import com.pomodify.backend.domain.model.UserPushToken;
import com.pomodify.backend.domain.repository.UserPushTokenRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/push")
@Tag(name = "Push Notifications", description = "Manage user push notification tokens and settings")
@RequiredArgsConstructor
public class PushController {

    private final UserPushTokenRepository tokenRepo;
    private final ScheduledPushService scheduledPushService;

    @PostMapping("/register-token")
    @Operation(summary = "Register or update push token")
    public ResponseEntity<?> registerToken(@AuthenticationPrincipal Jwt jwt,
                                           @RequestBody Map<String, String> payload) {
        if (jwt == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }
        Object userClaim = jwt.getClaims().get("user");
        Long userId = null;
        if (userClaim instanceof Number) {
            userId = ((Number) userClaim).longValue();
        } else if (userClaim instanceof String s) {
            try { userId = Long.parseLong(s); } catch (Exception ignored) {}
        }
        if (userId == null) {
            return ResponseEntity.status(401).body("Invalid user claim");
        }

        String token = payload.get("token");
        if (token == null || token.isBlank()) {
            return ResponseEntity.badRequest().body("Missing token");
        }

        Long finalUserId = userId;
        tokenRepo.findByUserId(finalUserId).ifPresentOrElse(existing -> {
            existing.setToken(token);
            existing.setEnabled(true); // re-enable on registration
            tokenRepo.save(existing);
        }, () -> {
            UserPushToken upt = UserPushToken.builder()
                    .userId(finalUserId)
                    .token(token)
                    .enabled(true)
                    .build();
            tokenRepo.save(upt);
        });

        return ResponseEntity.ok("Token registered");
    }

    @DeleteMapping("/unregister-token")
    @Operation(summary = "Unregister push token")
    public ResponseEntity<?> unregisterToken(@AuthenticationPrincipal Jwt jwt) {
        if (jwt == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }
        Object userClaim = jwt.getClaims().get("user");
        Long userId = null;
        if (userClaim instanceof Number) {
            userId = ((Number) userClaim).longValue();
        } else if (userClaim instanceof String s) {
            try { userId = Long.parseLong(s); } catch (Exception ignored) {}
        }
        if (userId == null) {
            return ResponseEntity.status(401).body("Invalid user claim");
        }
        tokenRepo.deleteByUserId(userId);
        return ResponseEntity.ok("Token unregistered");
    }

    @GetMapping("/status")
    @Operation(summary = "Get push registration status")
    public ResponseEntity<?> status(@AuthenticationPrincipal Jwt jwt) {
        if (jwt == null) return ResponseEntity.status(401).body("Unauthorized");
        Long userId = extractUserId(jwt);
        if (userId == null) return ResponseEntity.status(401).body("Invalid user claim");
        return tokenRepo.findByUserId(userId)
                .map(u -> ResponseEntity.ok(Map.of(
                        "registered", true,
                        "enabled", u.isEnabled()))
                )
                .orElseGet(() -> ResponseEntity.ok(Map.of(
                        "registered", false,
                        "enabled", false)));
    }

    @PutMapping("/enable")
    @Operation(summary = "Enable push notifications")
    public ResponseEntity<?> enable(@AuthenticationPrincipal Jwt jwt) {
        if (jwt == null) return ResponseEntity.status(401).body("Unauthorized");
        Long userId = extractUserId(jwt);
        if (userId == null) return ResponseEntity.status(401).body("Invalid user claim");
        return tokenRepo.findByUserId(userId)
                .map(u -> {
                    u.setEnabled(true);
                    tokenRepo.save(u);
                    return ResponseEntity.ok("Push enabled");
                })
                .orElseGet(() -> ResponseEntity.badRequest().body("No token registered"));
    }

    @PutMapping("/disable")
    @Operation(summary = "Disable push notifications")
    public ResponseEntity<?> disable(@AuthenticationPrincipal Jwt jwt) {
        if (jwt == null) return ResponseEntity.status(401).body("Unauthorized");
        Long userId = extractUserId(jwt);
        if (userId == null) return ResponseEntity.status(401).body("Invalid user claim");
        return tokenRepo.findByUserId(userId)
                .map(u -> {
                    u.setEnabled(false);
                    tokenRepo.save(u);
                    return ResponseEntity.ok("Push disabled");
                })
                .orElseGet(() -> ResponseEntity.badRequest().body("No token registered"));
    }

    private Long extractUserId(Jwt jwt) {
        Object userClaim = jwt.getClaims().get("user");
        Long userId = null;
        if (userClaim instanceof Number) {
            userId = ((Number) userClaim).longValue();
        } else if (userClaim instanceof String s) {
            try { userId = Long.parseLong(s); } catch (Exception ignored) {}
        }
        return userId;
    }

    // ==================== SCHEDULED PUSH NOTIFICATIONS ====================

    @PostMapping("/schedule")
    @Operation(summary = "Schedule a push notification for timer completion")
    public ResponseEntity<?> scheduleNotification(@AuthenticationPrincipal Jwt jwt,
                                                   @RequestBody Map<String, Object> payload) {
        if (jwt == null) return ResponseEntity.status(401).body("Unauthorized");
        Long userId = extractUserId(jwt);
        if (userId == null) return ResponseEntity.status(401).body("Invalid user claim");

        try {
            Long sessionId = payload.get("sessionId") != null ? 
                ((Number) payload.get("sessionId")).longValue() : null;
            Long activityId = payload.get("activityId") != null ? 
                ((Number) payload.get("activityId")).longValue() : null;
            String title = (String) payload.get("title");
            String body = (String) payload.get("body");
            Long delaySeconds = payload.get("delaySeconds") != null ? 
                ((Number) payload.get("delaySeconds")).longValue() : null;
            String notificationType = (String) payload.getOrDefault("notificationType", "PHASE_COMPLETE");
            String currentPhase = (String) payload.get("currentPhase");

            if (title == null || body == null || delaySeconds == null) {
                return ResponseEntity.badRequest().body("Missing required fields: title, body, delaySeconds");
            }

            Instant scheduledAt = Instant.now().plusSeconds(delaySeconds);
            
            ScheduledPushNotification notification = scheduledPushService.scheduleNotification(
                userId, sessionId, activityId, title, body, scheduledAt, notificationType, currentPhase
            );

            return ResponseEntity.ok(Map.of(
                "id", notification.getId(),
                "scheduledAt", notification.getScheduledAt().toString(),
                "message", "Notification scheduled successfully"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Failed to schedule notification: " + e.getMessage());
        }
    }

    @DeleteMapping("/schedule/{sessionId}")
    @Operation(summary = "Cancel scheduled notifications for a session")
    public ResponseEntity<?> cancelScheduledNotifications(@AuthenticationPrincipal Jwt jwt,
                                                          @PathVariable Long sessionId) {
        if (jwt == null) return ResponseEntity.status(401).body("Unauthorized");
        Long userId = extractUserId(jwt);
        if (userId == null) return ResponseEntity.status(401).body("Invalid user claim");

        scheduledPushService.cancelSessionNotifications(sessionId);
        return ResponseEntity.ok(Map.of("message", "Scheduled notifications cancelled"));
    }

    @DeleteMapping("/schedule")
    @Operation(summary = "Cancel all scheduled notifications for current user")
    public ResponseEntity<?> cancelAllScheduledNotifications(@AuthenticationPrincipal Jwt jwt) {
        if (jwt == null) return ResponseEntity.status(401).body("Unauthorized");
        Long userId = extractUserId(jwt);
        if (userId == null) return ResponseEntity.status(401).body("Invalid user claim");

        scheduledPushService.cancelUserNotifications(userId);
        return ResponseEntity.ok(Map.of("message", "All scheduled notifications cancelled"));
    }
}
