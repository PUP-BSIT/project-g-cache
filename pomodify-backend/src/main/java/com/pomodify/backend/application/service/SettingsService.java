package com.pomodify.backend.application.service;

import com.pomodify.backend.application.dto.UpdateSettingsDto;
import com.pomodify.backend.application.dto.UserSettingsDto;
import com.pomodify.backend.domain.model.settings.UserSettings;
import com.pomodify.backend.domain.repository.SettingsRepository;
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
    public UserSettingsDto getSettings(Long userId) {
        UserSettings settings = settingsRepository.findById(userId)
                .orElseGet(() -> settingsRepository.save(UserSettings.defaultSettings(userId)));
        return mapToDto(settings);
    }

    @Transactional
    @CacheEvict(cacheNames = "userSettings", key = "#userId")
    public UserSettingsDto updateSettings(Long userId, UpdateSettingsDto request) {
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


        UserSettings saved = settingsRepository.save(settings);
        if (request.notificationsEnabled() != null && prevNotifications != saved.isNotificationsEnabled()) {
            eventPublisher.publishEvent(new UserSettingsChangedEvent(this, userId, saved.isNotificationsEnabled()));
        }
        return mapToDto(saved);
    }

    private UserSettingsDto mapToDto(UserSettings s) {
        return new UserSettingsDto(
                s.getUserId(),
                s.getSoundType().name(),
                s.isNotificationSound(),
                s.getVolume(),

                s.isAutoStartBreaks(),
                s.isAutoStartPomodoros(),
                s.getTheme().name(),
                s.isNotificationsEnabled()
        );
    }
}
