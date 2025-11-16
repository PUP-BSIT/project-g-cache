package com.pomodify.backend.application.result;

public record CategoryResult(
        Long id,
        String name,
        boolean active,
        int activeActivitiesCount,
        int inactiveActivitiesCount
) {
}
