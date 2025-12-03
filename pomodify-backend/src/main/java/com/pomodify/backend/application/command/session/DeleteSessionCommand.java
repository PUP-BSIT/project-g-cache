package com.pomodify.backend.application.command.session;

import lombok.Builder;

@Builder
public record DeleteSessionCommand(
        Long user,
        Long sessionId
) {}
