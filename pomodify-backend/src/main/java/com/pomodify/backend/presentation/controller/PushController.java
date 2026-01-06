package com.pomodify.backend.presentation.controller;

import com.pomodify.backend.application.service.PushNotificationService;
import com.pomodify.backend.domain.model.UserPushToken;
import com.pomodify.backend.domain.repository.UserPushTokenRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/push")
@Tag(name = "Push Notifications", description = "Manage user push notification tokens and settings")
@RequiredArgsConstructor
public class PushController {

    private final UserPushTokenRepository tokenRepo;
    private final PushNotificationService pushNotificationService;

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
        
        // Reject fallback tokens - they cannot receive FCM messages
        if (token.startsWith("browser-fallback-")) {
            return ResponseEntity.badRequest().body("Invalid token: fallback tokens cannot receive push notifications. Please use a browser that supports FCM.");
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
    
    @GetMapping("/debug")
    @Operation(summary = "Debug push notification status for current user")
    public ResponseEntity<?> debug(@AuthenticationPrincipal Jwt jwt) {
        if (jwt == null) return ResponseEntity.status(401).body("Unauthorized");
        Long userId = extractUserId(jwt);
        if (userId == null) return ResponseEntity.status(401).body("Invalid user claim");
        
        var tokenOpt = tokenRepo.findByUserId(userId);
        if (tokenOpt.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                "hasToken", false,
                "message", "No FCM token registered. Background notifications will NOT work. Please enable notifications in your browser."
            ));
        }
        
        var token = tokenOpt.get();
        boolean isFallback = token.getToken() != null && token.getToken().startsWith("browser-fallback-");
        
        return ResponseEntity.ok(Map.of(
            "hasToken", true,
            "enabled", token.isEnabled(),
            "isFallbackToken", isFallback,
            "tokenPrefix", token.getToken() != null ? token.getToken().substring(0, Math.min(20, token.getToken().length())) + "..." : "null",
            "message", isFallback 
                ? "WARNING: You have a fallback token. Background notifications will NOT work. Please use a browser that supports FCM (Chrome, Firefox, Edge)."
                : (token.isEnabled() ? "FCM token registered and enabled. Background notifications should work." : "FCM token registered but disabled.")
        ));
    }
    
    @PostMapping("/test")
    @Operation(summary = "Send a test push notification to current user")
    public ResponseEntity<?> testPush(@AuthenticationPrincipal Jwt jwt,
                                      @RequestBody(required = false) Map<String, String> payload) {
        if (jwt == null) return ResponseEntity.status(401).body("Unauthorized");
        Long userId = extractUserId(jwt);
        if (userId == null) return ResponseEntity.status(401).body("Invalid user claim");
        
        String title = payload != null && payload.get("title") != null ? payload.get("title") : "🧪 Test Notification";
        String body = payload != null && payload.get("body") != null ? payload.get("body") : "This is a test push notification from Pomodify backend.";
        
        try {
            pushNotificationService.sendNotificationToUser(userId, title, body);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Test notification sent successfully! Check your browser/device."
            ));
        } catch (IllegalStateException e) {
            return ResponseEntity.ok(Map.of(
                "success", false,
                "message", "Notifications are disabled in your settings."
            ));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                "success", false,
                "message", "Failed to send notification: " + e.getMessage()
            ));
        }
    }
}
