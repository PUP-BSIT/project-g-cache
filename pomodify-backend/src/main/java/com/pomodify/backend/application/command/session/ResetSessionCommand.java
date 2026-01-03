package com.pomodify.backend.application.command.session;

import lombok.Builder;

@Builder
public record ResetSessionCommand(
        Long user,
        Long sessionId
) {
}
