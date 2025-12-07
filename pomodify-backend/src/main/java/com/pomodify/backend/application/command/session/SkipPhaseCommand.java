package com.pomodify.backend.application.command.session;

import lombok.Builder;

@Builder
public record SkipPhaseCommand(
        Long user,
        Long sessionId
) {
}
