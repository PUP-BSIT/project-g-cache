package com.pomodify.backend.application.helper;

import com.pomodify.backend.domain.model.User;
import com.pomodify.backend.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.security.oauth2.jwt.Jwt;

@Component
@RequiredArgsConstructor
public class UserHelper {

    private final UserRepository userRepository;

    public User getUserOrThrow(Long userId) {
        return userRepository.findUser(userId)
                .orElseThrow(() -> new IllegalStateException("User not found"));
    }

    public Long extractUserId(Jwt jwt) {
        if (jwt == null) return null;
        // Prefer standard subject if numeric, then custom userId, then legacy user claim
        Object userIdClaim = jwt.getClaims().get("userId");
        Object userClaim = jwt.getClaims().get("user");
        String sub = jwt.getSubject();

        // Try userId
        if (userIdClaim instanceof Number n1) {
            return n1.longValue();
        }
        if (userIdClaim instanceof String s1) {
            try { return Long.parseLong(s1); } catch (Exception ignored) { }
        }

        // Fallback: legacy user
        if (userClaim instanceof Number n) {
            return n.longValue();
        }
        if (userClaim instanceof String s) {
            try { return Long.parseLong(s); } catch (Exception ignored) { }
        }

        // Final fallback: subject if numeric
        if (sub != null) {
            try { return Long.parseLong(sub); } catch (Exception ignored) { }
        }
        return null;
    }
}
