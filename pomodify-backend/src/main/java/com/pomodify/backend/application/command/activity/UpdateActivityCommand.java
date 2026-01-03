package com.pomodify.backend.application.command.activity;

import jakarta.validation.constraints.NotNull;
import lombok.Builder;


@Builder
public record UpdateActivityCommand(
        @NotNull(message = "Activity ID is required")
        Long activityId,

        @NotNull(message = "User ID is required")
        Long user,

        Long changeCategoryIdTo,
        String changeActivityTitleTo,
        String changeActivityDescriptionTo,
        String changeColorTo
) {
}
