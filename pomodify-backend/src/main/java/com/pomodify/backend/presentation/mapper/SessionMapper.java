package com.pomodify.backend.presentation.mapper;

import com.pomodify.backend.application.result.SessionResult;
import com.pomodify.backend.presentation.dto.item.SessionItem;
import com.pomodify.backend.presentation.dto.response.SessionResponse;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

public final class SessionMapper {

    private SessionMapper() {}

    public static SessionItem toItem(SessionResult result) {
        return new SessionItem(
            result.id(),
            result.activityId(),
            result.sessionType(),
            result.status(),
            result.currentPhase(),
            result.focusTimeInMinutes(),
            result.breakTimeInMinutes(),
            result.cycles(),
            result.cyclesCompleted(),
            result.totalTimeInMinutes(),
            result.totalElapsedSeconds(),
            result.remainingPhaseSeconds(),
            result.longBreakTimeInMinutes(),
            result.longBreakIntervalCycles(),
            toPresentationNoteDto(result.note()),
            toStringOrNull(result.startedAt()),
            toStringOrNull(result.completedAt()),
            toStringOrNull(result.createdAt()),
            result.phaseNotified()
        );
    }

    /**
     * Maps application layer SessionNoteDto to presentation layer SessionNoteDto
     */
    private static com.pomodify.backend.presentation.dto.note.SessionNoteDto toPresentationNoteDto(
            com.pomodify.backend.application.dto.SessionNoteDto appDto) {
        if (appDto == null) {
            return null;
        }
        List<com.pomodify.backend.presentation.dto.note.SessionTodoItemDto> presentationItems = 
                appDto.items() != null 
                    ? appDto.items().stream()
                        .map(SessionMapper::toPresentationTodoItemDto)
                        .collect(Collectors.toList())
                    : null;
        return new com.pomodify.backend.presentation.dto.note.SessionNoteDto(
                appDto.id(),
                appDto.content(),
                presentationItems
        );
    }

    /**
     * Maps application layer SessionTodoItemDto to presentation layer SessionTodoItemDto
     */
    private static com.pomodify.backend.presentation.dto.note.SessionTodoItemDto toPresentationTodoItemDto(
            com.pomodify.backend.application.dto.SessionTodoItemDto appDto) {
        return new com.pomodify.backend.presentation.dto.note.SessionTodoItemDto(
                appDto.id(),
                appDto.text(),
                appDto.done(),
                appDto.orderIndex()
        );
    }

    /**
     * Maps presentation layer SessionNoteDto to application layer SessionNoteDto
     */
    public static com.pomodify.backend.application.dto.SessionNoteDto toApplicationNoteDto(
            com.pomodify.backend.presentation.dto.note.SessionNoteDto presentationDto) {
        if (presentationDto == null) {
            return null;
        }
        List<com.pomodify.backend.application.dto.SessionTodoItemDto> appItems = 
                presentationDto.items() != null 
                    ? presentationDto.items().stream()
                        .map(SessionMapper::toApplicationTodoItemDto)
                        .collect(Collectors.toList())
                    : null;
        return new com.pomodify.backend.application.dto.SessionNoteDto(
                presentationDto.id(),
                presentationDto.content(),
                appItems
        );
    }

    /**
     * Maps presentation layer SessionTodoItemDto to application layer SessionTodoItemDto
     */
    private static com.pomodify.backend.application.dto.SessionTodoItemDto toApplicationTodoItemDto(
            com.pomodify.backend.presentation.dto.note.SessionTodoItemDto presentationDto) {
        return new com.pomodify.backend.application.dto.SessionTodoItemDto(
                presentationDto.id(),
                presentationDto.text(),
                presentationDto.done(),
                presentationDto.orderIndex()
        );
    }

    private static String toStringOrNull(LocalDateTime dateTime) {
        return dateTime != null ? dateTime.toString() : null;
    }

    public static List<SessionItem> toItems(List<SessionResult> results) {
        return results.stream().map(SessionMapper::toItem).toList();
    }

    public static SessionResponse toResponse(SessionItem item, String message) {
        return new SessionResponse(message, List.of(item), 0,0,1);
    }

    public static SessionResponse toResponse(List<SessionItem> items, String message) {
        return new SessionResponse(message, items, 0,0, items.size());
    }
}
