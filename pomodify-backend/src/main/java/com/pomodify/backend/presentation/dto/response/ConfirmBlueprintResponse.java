package com.pomodify.backend.presentation.dto.response;

import lombok.Builder;

/**
 * Response DTO after confirming and saving an AI-generated blueprint.
 */
@Builder
public record ConfirmBlueprintResponse(
        String message,
        Long activityId,
        Long sessionId
) {
}
