package com.pomodify.backend.application.command.session;

import lombok.Builder;

@Builder
public record CancelSessionCommand(
        Long user,
        Long sessionId
) {}
