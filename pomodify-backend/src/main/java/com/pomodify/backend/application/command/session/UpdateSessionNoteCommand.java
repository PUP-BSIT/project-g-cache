package com.pomodify.backend.application.command.session;

import com.pomodify.backend.application.dto.SessionNoteDto;
import lombok.Builder;

@Builder
public record UpdateSessionNoteCommand(
        Long user,
        Long sessionId,
        SessionNoteDto note
) {}
