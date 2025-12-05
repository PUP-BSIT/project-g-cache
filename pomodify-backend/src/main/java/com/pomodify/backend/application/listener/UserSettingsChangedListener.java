package com.pomodify.backend.application.listener;

import com.pomodify.backend.application.event.UserSettingsChangedEvent;
import com.pomodify.backend.domain.model.UserPushToken;
import com.pomodify.backend.domain.repository.UserPushTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
public class UserSettingsChangedListener {

    private final UserPushTokenRepository tokenRepository;

    @EventListener
    public void onSettingsChanged(UserSettingsChangedEvent event) {
        Long userId = event.getUserId();
        boolean enabled = event.isNotificationsEnabled();

        Optional<UserPushToken> opt = tokenRepository.findByUserId(userId);
        if (opt.isEmpty()) {
            log.debug("No push token found for user {} when settings changed", userId);
            return;
        }

        UserPushToken token = opt.get();
        if (token.isEnabled() == enabled) {
            return; // no change needed
        }

        token.setEnabled(enabled);
        tokenRepository.save(token);
        log.info("Push token for user {} marked {}", userId, enabled ? "ENABLED" : "DISABLED");
    }
}
