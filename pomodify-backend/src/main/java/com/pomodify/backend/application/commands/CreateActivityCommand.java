package com.pomodify.backend.application.commands;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CreateActivityCommand {
    private final Long userId;
    private final Long categoryId;
    private final String name;
    private final String description;
}