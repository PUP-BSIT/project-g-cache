package com.pomodify.backend.presentation.dto.note;

public record SessionTodoItemDto(
        Long id,
        String text,
        boolean done,
        Integer orderIndex
) {
}
