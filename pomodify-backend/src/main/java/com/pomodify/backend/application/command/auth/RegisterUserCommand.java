package com.pomodify.backend.application.command.auth;

import lombok.Builder;

@Builder
public record RegisterUserCommand(
        String firstName,
        String lastName,
        String email,
        String password) {
}
