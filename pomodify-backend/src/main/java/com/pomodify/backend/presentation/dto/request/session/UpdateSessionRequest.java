package com.pomodify.backend.presentation.dto.request.session;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record UpdateSessionRequest(
        String sessionType,
        @Min(value = 5, message = "Focus time must be at least 5 minutes")
        @Max(value = 90, message = "Focus time must be at most 90 minutes")
        Integer focusTimeInMinutes,
        @Min(value = 2, message = "Short break must be at least 2 minutes")
        @Max(value = 10, message = "Short break must be at most 10 minutes")
        Integer breakTimeInMinutes,
        @Min(1) Integer cycles,
        Boolean enableLongBreak,
        @Min(value = 15, message = "Long break must be at least 15 minutes")
        @Max(value = 30, message = "Long break must be at most 30 minutes")
        Integer longBreakTimeInMinutes,
        @Min(180) Integer longBreakIntervalInMinutes,
        @Min(value = 2, message = "Long break interval must be at least 2 cycles")
        @Max(value = 10, message = "Long break interval must be at most 10 cycles")
        Integer longBreakIntervalInCycles
) {
}
