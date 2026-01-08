package com.pomodify.backend.presentation.dto.request.session;

import jakarta.validation.constraints.*;

public record SessionRequest(
        @NotBlank(message = "Session type is required")
        String sessionType,

        @NotNull(message = "Focus time is required")
        @Min(value = 5, message = "Focus time must be at least 5 minutes")
        @Max(value = 90, message = "Focus time must be at most 90 minutes")
        Integer focusTimeInMinutes,

        @NotNull(message = "Break time is required")
        @Min(value = 2, message = "Short break must be at least 2 minutes")
        @Max(value = 10, message = "Short break must be at most 10 minutes")
        Integer breakTimeInMinutes,

        @Min(value = 1, message = "Cycles must be at least 1")
        Integer cycles,

        Boolean enableLongBreak,

        @Min(value = 15, message = "Long break must be at least 15 minutes")
        @Max(value = 30, message = "Long break must be at most 30 minutes")
        Integer longBreakTimeInMinutes,

        @Min(value = 1, message = "Long break interval must be at least 1 minute")
        Integer longBreakIntervalInMinutes,

        @Min(value = 2, message = "Long break interval must be at least 2 cycles")
        @Max(value = 10, message = "Long break interval must be at most 10 cycles")
        Integer longBreakIntervalInCycles
) {
    // Constructor with defaults for optional fields
    public SessionRequest {
        if (enableLongBreak == null) enableLongBreak = false;
        if (longBreakTimeInMinutes == null) longBreakTimeInMinutes = 15;
        if (longBreakIntervalInMinutes == null) longBreakIntervalInMinutes = 150; // 5 cycles * 30 min
        if (longBreakIntervalInCycles == null) longBreakIntervalInCycles = 4; // Default 4 cycles
    }
}
