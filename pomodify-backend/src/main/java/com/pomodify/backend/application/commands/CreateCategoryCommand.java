package com.pomodify.backend.application.commands;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CreateCategoryCommand {
    private final Long userId;
    private final String name;
}