package com.pomodify.backend.application.result;

import com.pomodify.backend.application.dto.SessionNoteDto;
import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record SessionResult(
        Long id,
        Long activityId,
        String sessionType,
        String status,
        String currentPhase,
        int focusTimeInMinutes,
        int breakTimeInMinutes,
        int cycles,
        int cyclesCompleted,
        int totalTimeInMinutes,
        long totalElapsedSeconds,
        long remainingPhaseSeconds,
        Integer longBreakTimeInMinutes,
        Integer longBreakIntervalCycles,
        SessionNoteDto note,
        LocalDateTime startedAt,
        LocalDateTime completedAt,
        LocalDateTime createdAt,
        Boolean phaseNotified
) {}
