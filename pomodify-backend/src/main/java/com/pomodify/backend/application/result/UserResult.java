package com.pomodify.backend.application.result;

import lombok.Builder;

@Builder
public record UserResult(
        String firstName,
        String lastName,
        String email,
        boolean isEmailVerified,
        String backupEmail
) {
}
