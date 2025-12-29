package com.pomodify.backend.presentation.dto.item;

import lombok.Builder;

/**
 * Item DTO for AI-generated activity blueprint.
 */
@Builder
public record BlueprintItem(
        String activityTitle,
        String activityDescription,
        int focusMinutes,
        int breakMinutes,
        String firstSessionNote,
        boolean isFallback
) {
}
