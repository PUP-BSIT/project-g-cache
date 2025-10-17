package com.pomodify.backend.application.dto.response;

import java.time.LocalDateTime;

/**
 * DTO for user data in responses.
 * Excludes sensitive information like password hash.
 */
public record UserResponse(
        Long id,
        String username,
        String email,
        boolean isEmailVerified,
        LocalDateTime createdAt
) {
}

