package com.pomodify.backend.application.command.activity;

import lombok.Builder;
import org.springframework.data.domain.Pageable;

@Builder
public record GetAllActivityCommand(
        Long userId,
        Long categoryId,
        Boolean deleted,
        Pageable pageable
) {
}
