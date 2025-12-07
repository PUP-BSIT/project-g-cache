package com.pomodify.backend.presentation.controller;

import com.pomodify.backend.domain.model.UserPushToken;
import com.pomodify.backend.domain.repository.UserPushTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/push")
@RequiredArgsConstructor
public class PushController {

    private final UserPushTokenRepository tokenRepo;

    @PostMapping("/register-token")
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
}
