package com.pomodify.backend.presentation.dto.response;

public record AuthResponse(
        UserResponse user,
        String accessToken,
        String refreshToken
) {}
