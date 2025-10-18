package com.pomodify.backend.application.dto.response;

/**
 * Response DTO for user authentication.
 * Contains access token, refresh token, and user data.
 */
public record AuthResponse(
        UserResponse user,
        String accessToken,
        String refreshToken
) {
}
