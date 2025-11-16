package com.pomodify.backend.application.result;

public record AuthResult(
        String firstName,
        String lastName,
        String email,
        String accessToken,
        String refreshToken) {
}