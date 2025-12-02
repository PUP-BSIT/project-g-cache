package com.pomodify.backend.application.command.session;

import lombok.Builder;

@Builder
public record ResumeSessionCommand(
        Long user,
        Long sessionId
) {}
