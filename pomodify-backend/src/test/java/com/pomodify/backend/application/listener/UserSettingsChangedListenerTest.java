package com.pomodify.backend.application.listener;

import com.pomodify.backend.application.event.UserSettingsChangedEvent;
import com.pomodify.backend.domain.model.UserPushToken;
import com.pomodify.backend.domain.repository.UserPushTokenRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class UserSettingsChangedListenerTest {

    @Test
    void togglesTokenEnabledOnEvent() {
        UserPushTokenRepository repo = Mockito.mock(UserPushTokenRepository.class);
        UserSettingsChangedListener listener = new UserSettingsChangedListener(repo);

        Long userId = 200L;
        UserPushToken token = new UserPushToken();
        token.setUserId(userId);
        token.setToken("abc");
        token.setEnabled(true);
        when(repo.findByUserId(userId)).thenReturn(Optional.of(token));

        listener.onSettingsChanged(new UserSettingsChangedEvent(this, userId, false));

        ArgumentCaptor<UserPushToken> captor = ArgumentCaptor.forClass(UserPushToken.class);
        verify(repo).save(captor.capture());
        assertFalse(captor.getValue().isEnabled());
    }
}
