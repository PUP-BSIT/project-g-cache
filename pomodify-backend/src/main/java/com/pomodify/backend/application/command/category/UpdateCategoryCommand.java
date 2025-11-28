package com.pomodify.backend.application.command.category;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

@Builder
public record UpdateCategoryCommand(
        @NotNull(message = "Category ID is required")
        Long categoryId,

        @NotNull(message = "User ID is required")
        Long user,

        @NotBlank(message = "Category name is required")
        String changeCategoryName
) {}