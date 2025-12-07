package com.pomodify.backend.application.command.session;

import com.pomodify.backend.presentation.dto.note.SessionNoteDto;
import lombok.Builder;

@Builder
public record UpdateSessionNoteCommand(
        Long user,
        Long sessionId,
        SessionNoteDto note
) {}
