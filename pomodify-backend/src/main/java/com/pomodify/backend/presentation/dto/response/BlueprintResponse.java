package com.pomodify.backend.presentation.dto.response;

import lombok.Builder;

/**
 * Response DTO for AI-generated activity blueprint preview.
 */
@Builder
public record BlueprintResponse(
        String message,
        String activityTitle,
        String activityDescription,
        int focusMinutes,
        int breakMinutes,
        String firstSessionNote,
        boolean isFallback
) {
}
