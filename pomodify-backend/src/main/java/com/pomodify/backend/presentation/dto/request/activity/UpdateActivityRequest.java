package com.pomodify.backend.presentation.dto.request.activity;

import lombok.Builder;

@Builder
public record UpdateActivityRequest(
        Long newCategoryId,
        String newActivityTitle,
        String newActivityDescription
) {
}
