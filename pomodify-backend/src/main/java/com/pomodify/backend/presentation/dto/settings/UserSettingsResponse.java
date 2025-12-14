package com.pomodify.backend.presentation.dto.settings;

public record UserSettingsResponse(
        Long userId,
        String soundType,
        boolean notificationSound,
        int volume,

        boolean autoStartBreaks,
        boolean autoStartPomodoros,
        String theme,
        boolean notificationsEnabled,
        boolean googleCalendarSync
) {}
