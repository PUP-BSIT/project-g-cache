package com.pomodify.backend.presentation.dto.request.session;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record UpdateSessionRequest(
        String sessionType,
        @Min(1) Integer focusTimeInMinutes,
        @Min(2) @Max(10) Integer breakTimeInMinutes,
        @Min(1) Integer cycles,
        Boolean enableLongBreak,
        @Min(15) @Max(30) Integer longBreakTimeInMinutes,
        @Min(180) Integer longBreakIntervalInMinutes
) {
}
