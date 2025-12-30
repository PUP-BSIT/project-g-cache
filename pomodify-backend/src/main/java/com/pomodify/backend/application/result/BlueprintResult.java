package com.pomodify.backend.application.result;

import lombok.Builder;

/**
 * Result containing an AI-generated activity blueprint.
 */
@Builder
public record BlueprintResult(
        String activityTitle,
        String activityDescription,
        int focusMinutes,
        int breakMinutes,
        String firstSessionNote,
        boolean isFallback
) {
}
