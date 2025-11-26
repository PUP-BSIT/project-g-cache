package com.pomodify.backend.application.command.category;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

@Builder
public record CreateCategoryCommand(
        @NotNull(message = "User ID is required")
        Long user,

        @NotBlank(message = "Category name is required")
        String createCategory
) {}
