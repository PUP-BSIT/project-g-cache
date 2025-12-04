package com.pomodify.backend.presentation.dto.settings;

import com.pomodify.backend.domain.enums.AppTheme;
import com.pomodify.backend.domain.enums.SoundType;

public record UpdateSettingsRequest(
        SoundType soundType,
        Boolean notificationSound,
        Integer volume,
        Boolean tickSound,
        Boolean autoStartBreaks,
        Boolean autoStartPomodoros,
        AppTheme theme,
        Boolean notificationsEnabled,
        Boolean googleCalendarSync
) {}
