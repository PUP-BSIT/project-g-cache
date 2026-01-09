package com.pomodify.backend.application.dto;

import com.pomodify.backend.domain.enums.AppTheme;
import com.pomodify.backend.domain.enums.SoundType;

/**
 * Application layer DTO for updating settings.
 * Independent of presentation layer.
 */
public record UpdateSettingsDto(
        SoundType soundType,
        Boolean notificationSound,
        Integer volume,
        Boolean autoStartBreaks,
        Boolean autoStartPomodoros,
        AppTheme theme,
        Boolean notificationsEnabled
) {
}
