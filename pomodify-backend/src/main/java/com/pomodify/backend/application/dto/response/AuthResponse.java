package com.pomodify.backend.application.dto.response;

/**
 * Response DTO for user authentication.
 * Contains authentication token and user data.
 */
public record AuthResponse(
        String message,
        UserResponse user,
        String token  // Will be used later when implementing JWT
) {
}

