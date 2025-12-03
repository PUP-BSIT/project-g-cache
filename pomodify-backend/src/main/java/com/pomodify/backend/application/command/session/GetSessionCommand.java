package com.pomodify.backend.application.command.session;

import lombok.Builder;

@Builder
public record GetSessionCommand(
        Long user,
        Long sessionId
) {}
