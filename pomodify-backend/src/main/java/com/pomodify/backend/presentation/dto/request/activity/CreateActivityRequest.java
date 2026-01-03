package com.pomodify.backend.presentation.dto.request.activity;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Builder;

@Builder
public record CreateActivityRequest(
        @NotBlank(message = "Title is required")
        String title,

        String description,
        Long categoryId,

        @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Color must be a valid hex color (e.g., #4da1a9)")
        String color
) {
}
