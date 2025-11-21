package com.pomodify.backend.application.command.activity;

import jakarta.validation.constraints.NotBlank;
import lombok.Builder;
import lombok.Data;

@Builder
public record CreateActivityCommand(
        @NotBlank(message = "userId is required")
        Long userId,

        Long categoryId,

        @NotBlank(message = "Title is required")
        String title,

        String description
) {
}