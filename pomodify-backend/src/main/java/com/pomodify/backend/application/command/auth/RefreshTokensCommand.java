package com.pomodify.backend.application.command.auth;

import lombok.Builder;

@Builder
public record RefreshTokensCommand(String refreshToken) {
}
