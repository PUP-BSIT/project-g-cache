package com.pomodify.backend.application.command.category;

import lombok.Builder;

@Builder
public record DeleteCategoryCommand(
        Long categoryId
) {}

