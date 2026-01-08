package com.pomodify.backend.application.command.session;

import lombok.Builder;

@Builder
public record UpdateSessionCommand(
        Long user,
        Long sessionId,
        String sessionType,
        Integer focusTimeInMinutes,
        Integer breakTimeInMinutes,
        Integer cycles,
        Boolean enableLongBreak,
        Integer longBreakTimeInMinutes,
        Integer longBreakIntervalInMinutes,
        Integer longBreakIntervalInCycles
) {
}
