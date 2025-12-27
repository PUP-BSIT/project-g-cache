package com.pomodify.backend.application.result;

import lombok.Builder;

/**
 * Result after confirming and saving an AI-generated blueprint.
 */
@Builder
public record ConfirmBlueprintResult(
        Long activityId,
        Long sessionId
) {
}
