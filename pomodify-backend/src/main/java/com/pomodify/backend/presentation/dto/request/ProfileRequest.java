package com.pomodify.backend.presentation.dto.request;

import jakarta.validation.constraints.NotBlank;

public record ProfileRequest(
        @NotBlank(message = "Email is required")
        String Email
) {
}
