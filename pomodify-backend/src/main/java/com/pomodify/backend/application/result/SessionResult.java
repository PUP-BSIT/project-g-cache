package com.pomodify.backend.application.result;

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
        String note,
        LocalDateTime startedAt,
        LocalDateTime completedAt,
        LocalDateTime createdAt
) {}
