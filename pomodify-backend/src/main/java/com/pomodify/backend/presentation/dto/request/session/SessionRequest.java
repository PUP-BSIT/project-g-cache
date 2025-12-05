package com.pomodify.backend.presentation.dto.request.session;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record SessionRequest(
        @NotBlank(message = "Session type is required")
        String sessionType,

        @NotNull(message = "Focus time is required")
        @Min(value = 1, message = "Focus time must be at least 1 minute")
        Integer focusTimeInMinutes,

        @NotNull(message = "Break time is required")
        @Min(value = 1, message = "Break time must be at least 1 minute")
        Integer breakTimeInMinutes,

        @Min(value = 1, message = "Cycles must be at least 1")
        Integer cycles
) {
}
