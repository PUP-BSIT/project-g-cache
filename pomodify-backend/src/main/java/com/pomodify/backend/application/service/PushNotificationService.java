package com.pomodify.backend.application.service;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.WebpushConfig;
import com.google.firebase.messaging.WebpushNotification;
import com.google.firebase.messaging.MessagingErrorCode;
import com.pomodify.backend.domain.model.UserPushToken;
import com.pomodify.backend.domain.repository.UserPushTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class PushNotificationService {

    private final UserPushTokenRepository tokenRepository;

    public void sendNotificationToUser(Long userId, String title, String body) {
        Optional<UserPushToken> opt = tokenRepository.findByUserId(userId);
        if (opt.isEmpty()) {
            log.debug("No push token for user {} — skipping push", userId);
            return;
        }
        UserPushToken upt = opt.get();
        if (!upt.isEnabled()) {
            log.debug("Push disabled for user {} — skipping push", userId);
            return;
        }
        String token = upt.getToken();
        if (token == null || token.isBlank()) {
            log.debug("Empty push token for user {} — skipping push", userId);
            return;
        }
        Message message = Message.builder()
                .setToken(token)
                .setWebpushConfig(WebpushConfig.builder()
                        .setNotification(new WebpushNotification(title, body))
                        .build())
                .build();
        try {
            String response = FirebaseMessaging.getInstance().send(message);
            log.info("FCM push sent to user {}: {}", userId, response);
        } catch (FirebaseMessagingException e) {
            log.warn("FCM push failed for user {}: {}", userId, e.getMessage());
            // Remove invalid/unregistered tokens
            if (e.getMessagingErrorCode() != null) {
                MessagingErrorCode code = e.getMessagingErrorCode();
                switch (code) {
                    case UNREGISTERED:
                    case INVALID_ARGUMENT:
                        log.info("Removing invalid push token for user {}", userId);
                        tokenRepository.deleteByUserId(userId);
                        break;
                    default:
                        // keep token, transient error
                        break;
                }
            }
        }
    }
}
