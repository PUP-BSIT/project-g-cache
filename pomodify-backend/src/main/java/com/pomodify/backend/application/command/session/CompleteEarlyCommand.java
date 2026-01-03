package com.pomodify.backend.application.command.session;

import lombok.Builder;

@Builder
public record CompleteEarlyCommand(
        Long user,
        Long sessionId
) {}
