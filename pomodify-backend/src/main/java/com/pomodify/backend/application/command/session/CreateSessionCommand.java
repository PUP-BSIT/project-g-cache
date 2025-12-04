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
        String note
) {}
