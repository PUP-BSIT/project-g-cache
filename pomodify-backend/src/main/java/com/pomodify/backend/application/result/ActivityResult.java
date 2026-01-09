package com.pomodify.backend.application.result;

import lombok.Builder;

@Builder
public record ActivityResult(
        Long activityId,
        Long categoryId,
        String categoryName,
        String activityTitle,
        String activityDescription,
        String color,
        java.time.LocalDateTime createdAt,
        java.time.LocalDateTime updatedAt,
        Integer completionRate
) {
}
