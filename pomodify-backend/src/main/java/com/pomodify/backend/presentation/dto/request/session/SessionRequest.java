package com.pomodify.backend.presentation.dto.request.session;

import jakarta.validation.constraints.*;

public record SessionRequest(
        @NotBlank(message = "Session type is required")
        String sessionType,

        @NotNull(message = "Focus time is required")
        @Min(value = 1, message = "Focus time must be at least 1 minute")
        Integer focusTimeInMinutes,

        @NotNull(message = "Break time is required")
        @Min(value = 2, message = "Short break must be at least 2 minutes")
        @Max(value = 10, message = "Short break must be at most 10 minutes")
        Integer breakTimeInMinutes,

        @Min(value = 1, message = "Cycles must be at least 1")
        Integer cycles,

        boolean enableLongBreak,

        @Min(value = 15, message = "Long break must be at least 15 minutes")
        @Max(value = 30, message = "Long break must be at most 30 minutes")
        Integer longBreakTimeInMinutes,

        @Min(value = 180, message = "Long break interval must be at least 180 minutes (3 hours)")
        Integer longBreakIntervalInMinutes
) {
}
