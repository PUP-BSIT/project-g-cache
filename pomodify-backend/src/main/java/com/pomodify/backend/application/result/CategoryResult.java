package com.pomodify.backend.application.result;

import java.time.LocalDateTime;

public record CategoryResult(
        Long id,
        String name,
        boolean active,
        int activeActivitiesCount,
        int inactiveActivitiesCount
) {
}
