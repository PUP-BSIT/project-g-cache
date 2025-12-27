package com.pomodify.backend.application.result;

import lombok.Builder;

/**
 * Result after starting a Quick Focus session.
 */
@Builder
public record QuickFocusResult(
        Long activityId,
        Long sessionId
) {
}
