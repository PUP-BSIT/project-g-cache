package com.pomodify.backend.application.command.category;

import jakarta.validation.constraints.NotBlank;
import lombok.Builder;

@Builder
public record UpdateCategoryCommand(
        Long categoryId,
        @NotBlank(message = "Category name is required")
        String newName
) {}