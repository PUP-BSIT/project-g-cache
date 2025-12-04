package com.pomodify.backend.presentation.dto.item;

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
        String note,  // nullable - can be added on pause, stop, completion, or edited later
        LocalDateTime startedAt,
        LocalDateTime completedAt,
        LocalDateTime createdAt
) {}
