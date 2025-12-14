package com.pomodify.backend.application.service;

import com.pomodify.backend.domain.model.settings.UserSettings;
import com.pomodify.backend.domain.repository.SettingsRepository;
import com.pomodify.backend.presentation.dto.settings.UpdateSettingsRequest;
import com.pomodify.backend.presentation.dto.settings.UserSettingsResponse;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.ApplicationEventPublisher;
import com.pomodify.backend.application.event.UserSettingsChangedEvent;

@Service
@RequiredArgsConstructor
public class SettingsService {

    private final SettingsRepository settingsRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Cacheable(cacheNames = "userSettings", key = "#userId")
    public UserSettingsResponse getSettings(Long userId) {
        UserSettings settings = settingsRepository.findById(userId)
                .orElseGet(() -> settingsRepository.save(UserSettings.defaultSettings(userId)));
        return mapToResponse(settings);
    }

    @Transactional
    @CacheEvict(cacheNames = "userSettings", key = "#userId")
    public UserSettingsResponse updateSettings(Long userId, UpdateSettingsRequest request) {
        UserSettings settings = settingsRepository.findById(userId)
                .orElseGet(() -> settingsRepository.save(UserSettings.defaultSettings(userId)));

        if (request.soundType() != null) settings.setSoundType(request.soundType());
        if (request.notificationSound() != null) settings.setNotificationSound(request.notificationSound());
        if (request.volume() != null) {
            int v = Math.max(0, Math.min(100, request.volume()));
            settings.setVolume(v);
        }

        if (request.autoStartBreaks() != null) settings.setAutoStartBreaks(request.autoStartBreaks());
        if (request.autoStartPomodoros() != null) settings.setAutoStartPomodoros(request.autoStartPomodoros());
        if (request.theme() != null) settings.setTheme(request.theme());
        Boolean prevNotifications = settings.isNotificationsEnabled();
        if (request.notificationsEnabled() != null) settings.setNotificationsEnabled(request.notificationsEnabled());
        if (request.googleCalendarSync() != null) settings.setGoogleCalendarSync(request.googleCalendarSync());

        UserSettings saved = settingsRepository.save(settings);
        if (request.notificationsEnabled() != null && prevNotifications != saved.isNotificationsEnabled()) {
            eventPublisher.publishEvent(new UserSettingsChangedEvent(this, userId, saved.isNotificationsEnabled()));
        }
        return mapToResponse(saved);
    }

    private UserSettingsResponse mapToResponse(UserSettings s) {
        return new UserSettingsResponse(
                s.getUserId(),
                s.getSoundType().name(),
                s.isNotificationSound(),
                s.getVolume(),

                s.isAutoStartBreaks(),
                s.isAutoStartPomodoros(),
                s.getTheme().name(),
                s.isNotificationsEnabled(),
                s.isGoogleCalendarSync()
        );
    }
}
