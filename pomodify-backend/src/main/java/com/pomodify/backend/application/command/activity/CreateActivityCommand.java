package com.pomodify.backend.application.command.activity;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

@Builder
public record CreateActivityCommand(
        @NotNull(message = "user is required")
        Long user,

        Long categoryId,

        @NotBlank(message = "Title is required")
        String createActivityTitle,

        String createDescription
) {
}