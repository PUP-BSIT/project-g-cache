package com.pomodify.backend.presentation.dto.item;

import lombok.Builder;

/**
 * Item DTO for confirmed blueprint result.
 */
@Builder
public record ConfirmBlueprintItem(
        Long activityId,
        Long sessionId
) {
}
