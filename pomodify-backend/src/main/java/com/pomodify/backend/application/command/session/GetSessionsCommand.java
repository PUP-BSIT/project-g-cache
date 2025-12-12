package com.pomodify.backend.application.command.session;

import lombok.Builder;

@Builder
public record GetSessionsCommand(
        Long user,
        Long activityId,
        String status,
        Boolean deleted
) {}
