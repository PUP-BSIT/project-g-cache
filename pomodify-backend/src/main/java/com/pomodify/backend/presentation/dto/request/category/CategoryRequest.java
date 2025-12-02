package com.pomodify.backend.presentation.dto.request.category;

import jakarta.validation.constraints.NotBlank;

public record CategoryRequest(
        @NotBlank(message = "Category name is required")
        String categoryName
) {
}
