package com.pomodify.backend.application.command.session;

import lombok.Builder;

@Builder
public record StartSessionCommand(
        Long user,
        Long sessionId
) {}
