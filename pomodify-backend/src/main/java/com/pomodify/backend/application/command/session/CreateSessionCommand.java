package com.pomodify.backend.application.command.session;

import lombok.Builder;

@Builder
public record CreateSessionCommand(
        Long user,
        Long activityId,
        String sessionType,
        Integer focusTimeInMinutes,
        Integer breakTimeInMinutes,
        Integer cycles,
        Boolean enableLongBreak,
        Integer longBreakTimeInMinutes,
        Integer longBreakIntervalInMinutes,
        Integer longBreakIntervalInCycles,
        String note
) {
}
