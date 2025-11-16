package com.pomodify.backend.application.command.auth;

import lombok.Builder;

@Builder
public record LogoutCommand(String token) {
}
