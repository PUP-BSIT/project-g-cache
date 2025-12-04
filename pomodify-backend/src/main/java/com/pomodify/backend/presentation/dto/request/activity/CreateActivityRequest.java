package com.pomodify.backend.presentation.dto.request.activity;

import jakarta.validation.constraints.NotBlank;
import lombok.Builder;

@Builder
public record CreateActivityRequest(
        @NotBlank(message = "Title is required")
        String title,

        String description,
        Long categoryId
) {
}
