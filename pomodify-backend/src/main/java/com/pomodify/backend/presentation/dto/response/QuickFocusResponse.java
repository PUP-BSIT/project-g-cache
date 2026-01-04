package com.pomodify.backend.presentation.dto.response;

import lombok.Builder;

/**
 * Response DTO for Quick Focus action.
 */
@Builder
public record QuickFocusResponse(
        String message,
        Long activityId,
        Long sessionId,
        String activityTitle
) {
}
