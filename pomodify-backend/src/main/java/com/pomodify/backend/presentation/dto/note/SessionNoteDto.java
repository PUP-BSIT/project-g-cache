package com.pomodify.backend.presentation.dto.note;

import java.util.List;

public record SessionNoteDto(
        Long id,
        String content,
        List<SessionTodoItemDto> items
) {
}
