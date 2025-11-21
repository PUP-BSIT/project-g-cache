package com.pomodify.backend.application.command.category;

import jakarta.validation.constraints.NotBlank;
import lombok.Builder;

@Builder
public record CreateCategoryCommand(
        @NotBlank(message = "Category name is required")
        String name,
        Long userId
) {}
