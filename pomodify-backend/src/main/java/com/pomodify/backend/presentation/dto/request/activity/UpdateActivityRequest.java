package com.pomodify.backend.presentation.dto.request.activity;

import jakarta.validation.constraints.Pattern;
import lombok.Builder;

@Builder
public record UpdateActivityRequest(
        Long newCategoryId,
        String newActivityTitle,
        String newActivityDescription,

        @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Color must be a valid hex color (e.g., #4da1a9)")
        String newColor
) {
}
