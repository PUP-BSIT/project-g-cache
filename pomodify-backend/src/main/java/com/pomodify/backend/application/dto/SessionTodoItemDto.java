package com.pomodify.backend.application.dto;

/**
 * Application layer DTO for session todo items.
 * Independent of presentation layer.
 */
public record SessionTodoItemDto(
        Long id,
        String text,
        boolean done,
        Integer orderIndex
) {
}
