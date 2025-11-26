package com.pomodify.backend.presentation.dto.item;

import lombok.Builder;

@Builder
public record ActivityItem(
        Long activityId,
        Long categoryId,
        String activityTitle,
        String activityDescription
) {
}
