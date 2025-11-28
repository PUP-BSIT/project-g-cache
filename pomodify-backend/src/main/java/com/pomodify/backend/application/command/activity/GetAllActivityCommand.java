package com.pomodify.backend.application.command.activity;

import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import org.springframework.data.domain.Pageable;

@Builder
public record GetAllActivityCommand(
        @NotNull
        Long user,

        Long categoryId,
        Boolean deleted,
        Pageable pageable,
        String sortBy,
        String sortOrder
) {
}
