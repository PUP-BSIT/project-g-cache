package com.pomodify.backend.presentation.dto.item;

import com.pomodify.backend.presentation.dto.note.SessionNoteDto;

public record SessionItem(
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
        String startedAt,
        String completedAt,
        String createdAt,
        Boolean phaseNotified
) {}
