package com.pomodify.backend.application.command.activity;

import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.util.Optional;

@Builder
public record UpdateActivityCommand(
        @NotNull(message = "Activity ID is required")
        Long activityId,

        @NotNull(message = "User ID is required")
        Long activityOwnerId,
        Long changeCategoryIdTo,
        String changeActivityTitleTo,
        String changeActivityDescriptionTo
) {
}
