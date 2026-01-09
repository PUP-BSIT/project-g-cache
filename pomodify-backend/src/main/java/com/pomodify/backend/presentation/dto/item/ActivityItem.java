package com.pomodify.backend.presentation.dto.item;

import lombok.Builder;

@Builder
public record ActivityItem(
        Long activityId,
        Long categoryId,
        String categoryName,
        String activityTitle,
        String activityDescription,
        String color,
        String createdAt,
        String updatedAt,
        Integer completionRate
) {
}
