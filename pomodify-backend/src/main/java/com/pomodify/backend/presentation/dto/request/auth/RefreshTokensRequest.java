package com.pomodify.backend.presentation.dto.request.auth;

import jakarta.validation.constraints.NotBlank;

/**
 * Request DTO for token refresh.
 */
public record RefreshTokensRequest(
        @NotBlank(message = "Refresh token is required")
        String refreshToken
) {}
