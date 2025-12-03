package com.pomodify.backend.presentation.dto.request.auth;

import jakarta.validation.constraints.NotBlank;

public record LogoutRequest(
        @NotBlank(message = "Token is required")
        String token
) {}