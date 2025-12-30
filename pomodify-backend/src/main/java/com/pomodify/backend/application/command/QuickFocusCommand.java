package com.pomodify.backend.application.command;

import jakarta.validation.constraints.NotNull;
import lombok.Builder;

/**
 * Command for starting a Quick Focus session.
 */
@Builder
public record QuickFocusCommand(
        @NotNull(message = "User ID is required")
        Long userId
) {
}
