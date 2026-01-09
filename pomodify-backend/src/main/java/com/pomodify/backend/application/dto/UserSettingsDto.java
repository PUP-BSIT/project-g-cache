package com.pomodify.backend.application.dto;

/**
 * Application layer DTO for user settings.
 * Independent of presentation layer.
 */
public record UserSettingsDto(
        Long userId,
        String soundType,
        boolean notificationSound,
        int volume,
        boolean autoStartBreaks,
        boolean autoStartPomodoros,
        String theme,
        boolean notificationsEnabled
) {
}
