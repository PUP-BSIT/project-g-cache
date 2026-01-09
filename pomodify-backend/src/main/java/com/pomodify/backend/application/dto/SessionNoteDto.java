package com.pomodify.backend.application.dto;

import java.util.List;

/**
 * Application layer DTO for session notes.
 * Independent of presentation layer.
 */
public record SessionNoteDto(
        Long id,
        String content,
        List<SessionTodoItemDto> items
) {
}
