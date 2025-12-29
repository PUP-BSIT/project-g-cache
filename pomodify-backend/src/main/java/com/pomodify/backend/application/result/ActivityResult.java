package com.pomodify.backend.application.result;

import lombok.Builder;

@Builder
public record ActivityResult(
        Long activityId,
        Long categoryId,
        String activityTitle,
        String activityDescription,
        java.time.LocalDateTime createdAt,
        java.time.LocalDateTime updatedAt
) {
}
