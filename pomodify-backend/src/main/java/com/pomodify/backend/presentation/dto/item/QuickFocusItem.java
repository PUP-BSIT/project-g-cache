package com.pomodify.backend.presentation.dto.item;

import lombok.Builder;

/**
 * Item DTO for Quick Focus result.
 */
@Builder
public record QuickFocusItem(
        Long activityId,
        Long sessionId
) {
}
