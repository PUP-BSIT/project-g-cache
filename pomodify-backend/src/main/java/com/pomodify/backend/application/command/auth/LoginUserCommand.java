package com.pomodify.backend.application.command.auth;

import lombok.Builder;

@Builder
public record LoginUserCommand(String email, String password) {
}