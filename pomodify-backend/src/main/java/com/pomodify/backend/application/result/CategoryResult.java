package com.pomodify.backend.application.result;

import lombok.Builder;

@Builder
public record CategoryResult(
        Long categoryId,
        String categoryName,
        Long activitiesCount
) {
}
