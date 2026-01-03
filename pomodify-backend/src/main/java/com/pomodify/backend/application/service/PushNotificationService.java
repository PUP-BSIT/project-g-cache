package com.pomodify.backend.application.service;

import com.google.firebase.messaging.AndroidConfig;
import com.google.firebase.messaging.AndroidNotification;
import com.google.firebase.messaging.ApnsConfig;
import com.google.firebase.messaging.Aps;
import com.google.firebase.messaging.ApsAlert;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import com.google.firebase.messaging.WebpushConfig;
import com.google.firebase.messaging.WebpushNotification;
import com.google.firebase.messaging.MessagingErrorCode;
import com.pomodify.backend.domain.model.UserPushToken;
import com.pomodify.backend.domain.repository.UserPushTokenRepository;
import com.pomodify.backend.domain.repository.SettingsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class PushNotificationService {

    private final UserPushTokenRepository tokenRepository;
    private final SettingsRepository settingsRepository;
    
    // Android channel ID for high-priority timer notifications
    private static final String ANDROID_CHANNEL_ID = "pomodoro_urgent_channel";

    public void sendNotificationToUser(Long userId, String title, String body) {
        // Global settings guard: respect notificationsEnabled
        settingsRepository.findById(userId).ifPresent(settings -> {
            if (!settings.isNotificationsEnabled()) {
                log.debug("Notifications disabled in settings for user {} — skipping push", userId);
                throw new IllegalStateException("Notifications disabled");
            }
        });
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
                // Base notification (fallback for platforms not explicitly configured)
                .setNotification(Notification.builder()
                        .setTitle(title)
                        .setBody(body)
                        .build())
                // Android configuration for heads-up notification
                .setAndroidConfig(AndroidConfig.builder()
                        .setPriority(AndroidConfig.Priority.HIGH)
                        .setNotification(AndroidNotification.builder()
                                .setTitle(title)
                                .setBody(body)
                                .setChannelId(ANDROID_CHANNEL_ID)
                                .setPriority(AndroidNotification.Priority.HIGH)
                                .setDefaultVibrateTimings(true)
                                .setDefaultSound(true)
                                .setIcon("ic_notification")
                                .setColor("#6366f1")
                                .build())
                        .build())
                // iOS/APNs configuration for banner notification
                .setApnsConfig(ApnsConfig.builder()
                        .putHeader("apns-priority", "10") // High priority for immediate delivery
                        .putHeader("apns-push-type", "alert")
                        .setAps(Aps.builder()
                                .setAlert(ApsAlert.builder()
                                        .setTitle(title)
                                        .setBody(body)
                                        .build())
                                .setSound("default")
                                .setBadge(1)
                                .build())
                        .build())
                // Web push configuration
                .setWebpushConfig(WebpushConfig.builder()
                        .putHeader("Urgency", "high") // Web Push urgency header
                        .putHeader("TTL", "86400") // Time to live: 24 hours
                        .setNotification(WebpushNotification.builder()
                                .setTitle(title)
                                .setBody(body)
                                .setIcon("/assets/images/logo.png")
                                .setBadge("/assets/images/logo.png")
                                .setTag("pomodify-timer-" + System.currentTimeMillis()) // Unique tag
                                .setRequireInteraction(true)
                                .setRenotify(true)
                                .putCustomData("sound", "default")
                                .build())
                        .build())
                // Data payload - important for service worker to handle background messages
                .putData("title", title)
                .putData("body", body)
                .putData("sound", "default")
                .putData("click_action", "OPEN_TIMER")
                .putData("timestamp", String.valueOf(System.currentTimeMillis()))
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
