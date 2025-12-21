package com.pomodify.backend.application.result;

import lombok.Builder;

@Builder
public record AuthResult(
        String firstName,
        String lastName,
        String email,
        boolean isEmailVerified,
        String accessToken,
        String refreshToken) {
}