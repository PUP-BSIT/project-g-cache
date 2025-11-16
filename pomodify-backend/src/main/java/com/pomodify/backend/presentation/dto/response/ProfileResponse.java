package com.pomodify.backend.presentation.dto.response;

import java.time.LocalDateTime;

public record ProfileResponse(
        String firstName,
        String lastName,
        String email,
        boolean isEmailVerified,
        LocalDateTime createdAt
) {}

