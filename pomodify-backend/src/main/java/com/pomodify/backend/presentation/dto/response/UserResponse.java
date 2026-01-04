package com.pomodify.backend.presentation.dto.response;

public record UserResponse(
        String firstName,
        String lastName,
        String email,
        boolean isEmailVerified,
        String backupEmail,
        String profilePictureUrl
) {}