package com.pomodify.backend.presentation.dto.request.category;

import jakarta.validation.constraints.NotBlank;

public record UpdateCategoryRequest(
        @NotBlank(message = "Category name is required")
        String newCategoryName
) {
}
