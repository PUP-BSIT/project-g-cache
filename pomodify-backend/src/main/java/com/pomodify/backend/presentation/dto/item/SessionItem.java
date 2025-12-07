package com.pomodify.backend.presentation.dto.item;

import com.pomodify.backend.presentation.dto.note.SessionNoteDto;

import java.time.LocalDateTime;

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
        SessionNoteDto note,
        LocalDateTime startedAt,
        LocalDateTime completedAt,
        LocalDateTime createdAt
) {}
