package com.pomodify.backend.application.command.activity;

import lombok.Builder;

@Builder
public record GetActivityCommand(
    Long activityId,
    Long user
) {
}
