package com.pomodify.backend.application.service;

import com.pomodify.backend.domain.model.settings.UserSettings;
import com.pomodify.backend.domain.repository.SettingsRepository;
import com.pomodify.backend.domain.repository.UserPushTokenRepository;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

class PushNotificationEnforcementTest {

    @Test
    void pushIsBlockedWhenNotificationsDisabled() {
        SettingsRepository settingsRepository = Mockito.mock(SettingsRepository.class);
        UserPushTokenRepository tokenRepository = Mockito.mock(UserPushTokenRepository.class);
        PushNotificationService service = new PushNotificationService(tokenRepository, settingsRepository);

        Long userId = 55L;
        UserSettings settings = UserSettings.defaultSettings(userId);
        settings.setNotificationsEnabled(false);
        when(settingsRepository.findById(userId)).thenReturn(Optional.of(settings));

        assertThrows(IllegalStateException.class, () -> service.sendNotificationToUser(userId, "t", "b"));
    }

    @Test
    void pushSkipsWhenNoTokenEvenIfEnabled() {
        SettingsRepository settingsRepository = Mockito.mock(SettingsRepository.class);
        UserPushTokenRepository tokenRepository = Mockito.mock(UserPushTokenRepository.class);
        PushNotificationService service = new PushNotificationService(tokenRepository, settingsRepository);

        Long userId = 56L;
        UserSettings settings = UserSettings.defaultSettings(userId);
        settings.setNotificationsEnabled(true);
        when(settingsRepository.findById(userId)).thenReturn(Optional.of(settings));
        when(tokenRepository.findByUserId(userId)).thenReturn(Optional.empty());

        assertDoesNotThrow(() -> service.sendNotificationToUser(userId, "t", "b"));
    }
}
