package com.pomodify.backend.application.command.activity;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UpdateActivityCommand {
    private final Long activityId;
    private final Long userId;
    private final String name;
    private final String description;
    private final Long categoryId;
}