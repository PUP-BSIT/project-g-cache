package com.pomodify.backend.application.command.session;

import lombok.Builder;

@Builder
public record PauseSessionCommand(
        Long user,
        Long sessionId,
        String note
) {}
