package com.pomodify.backend.application.service;

import com.pomodify.backend.domain.enums.AppTheme;
import com.pomodify.backend.domain.enums.SoundType;
import com.pomodify.backend.presentation.dto.settings.UpdateSettingsRequest;
import com.pomodify.backend.presentation.dto.settings.UserSettingsResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
    "spring.profiles.active=test"
})
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class SettingsServicePersistenceTest {

    @Autowired
    private SettingsService settingsService;

    @Test
    void updatesPersistAndAreRetrievable() {
        Long userId = 123L;

        // Ensure defaults created
        UserSettingsResponse initial = settingsService.getSettings(userId);
        assertNotNull(initial);
        assertEquals(userId, initial.userId());
        assertEquals(SoundType.BELL.name(), initial.soundType());
        assertEquals(70, initial.volume());
        assertTrue(initial.notificationSound());

        // Perform partial update
        UpdateSettingsRequest req = new UpdateSettingsRequest(
                SoundType.SOFT_DING,
                null,
                45,
                true,
                false,
                AppTheme.DARK,
                true,
                false
        );
        UserSettingsResponse updated = settingsService.updateSettings(userId, req);

        assertEquals(SoundType.SOFT_DING.name(), updated.soundType());
        assertEquals(45, updated.volume());
        assertTrue(updated.autoStartBreaks());
        assertFalse(updated.autoStartPomodoros());
        assertEquals(AppTheme.DARK.name(), updated.theme());
        assertTrue(updated.notificationsEnabled());
        assertFalse(updated.googleCalendarSync());

        // Retrieve and verify cached/DB reflects changes
        UserSettingsResponse again = settingsService.getSettings(userId);
        assertEquals(updated, again);
    }
}
