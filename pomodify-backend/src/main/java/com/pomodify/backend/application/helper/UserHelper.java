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
        Object userClaim = jwt.getClaims().get("user");
        if (userClaim instanceof Number n) {
            return n.longValue();
        }
        if (userClaim instanceof String s) {
            try { return Long.parseLong(s); } catch (Exception ignored) { }
        }
        return null;
    }
}
