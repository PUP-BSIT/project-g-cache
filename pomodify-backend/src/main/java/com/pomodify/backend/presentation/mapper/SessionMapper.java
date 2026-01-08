package com.pomodify.backend.presentation.mapper;

import com.pomodify.backend.application.result.SessionResult;
import com.pomodify.backend.presentation.dto.item.SessionItem;
import com.pomodify.backend.presentation.dto.response.SessionResponse;

import java.util.List;

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
            result.note(),
            result.startedAt(),
            result.completedAt(),
            result.createdAt(),
            result.phaseNotified()
        );
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
