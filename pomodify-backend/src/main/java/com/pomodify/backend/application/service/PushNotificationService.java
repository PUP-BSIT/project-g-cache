package com.pomodify.backend.application.service;

import com.google.firebase.messaging.AndroidConfig;
import com.google.firebase.messaging.ApnsConfig;
import com.google.firebase.messaging.Aps;
import com.google.firebase.messaging.ApsAlert;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.WebpushConfig;
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

    public void sendNotificationToUser(Long userId, String title, String body) {
        log.info("📤 Attempting to send notification to user {}: title='{}', body='{}'", userId, title, body);
        
        // Global settings guard: respect notificationsEnabled
        var settingsOpt = settingsRepository.findById(userId);
        if (settingsOpt.isPresent() && !settingsOpt.get().isNotificationsEnabled()) {
            log.info("🔕 Notifications disabled in settings for user {} — skipping push", userId);
            throw new IllegalStateException("Notifications disabled");
        }
        
        Optional<UserPushToken> opt = tokenRepository.findByUserId(userId);
        if (opt.isEmpty()) {
            log.warn("⚠️ No push token for user {} — skipping push. User needs to enable notifications in browser.", userId);
            return;
        }
        UserPushToken upt = opt.get();
        if (!upt.isEnabled()) {
            log.info("🔕 Push disabled for user {} — skipping push", userId);
            return;
        }
        String token = upt.getToken();
        if (token == null || token.isBlank()) {
            log.warn("⚠️ Empty push token for user {} — skipping push", userId);
            return;
        }
        
        // Check if this is a fallback token (not a real FCM token)
        if (token.startsWith("browser-fallback-")) {
            log.warn("⚠️ User {} has a fallback token (not a real FCM token) — FCM push will fail. Token: {}", userId, token);
            log.warn("⚠️ Background notifications will NOT work for user {} until they get a real FCM token", userId);
            return; // Don't even try to send - it will fail
        }
        
        log.info("📤 Sending FCM notification to user {} with token: {}...", userId, token.substring(0, Math.min(20, token.length())));
        
        // IMPORTANT: We send DATA-ONLY messages (no notification payload) for web push.
        // This allows the service worker to have full control over notification display
        // and prevents duplicate notifications.
        // 
        // When a message has a 'notification' payload, the browser automatically displays it
        // AND the service worker's push handler also runs, causing duplicates.
        // With data-only messages, only the service worker handles the notification.
        Message message = Message.builder()
                .setToken(token)
                // NO .setNotification() - this would cause browser to auto-show notification
                // Android configuration - use data message with high priority
                .setAndroidConfig(AndroidConfig.builder()
                        .setPriority(AndroidConfig.Priority.HIGH)
                        // NO .setNotification() for Android either - let service worker handle it
                        .build())
                // iOS/APNs configuration for banner notification (iOS needs notification payload)
                .setApnsConfig(ApnsConfig.builder()
                        .putHeader("apns-priority", "10")
                        .putHeader("apns-push-type", "alert")
                        .setAps(Aps.builder()
                                .setAlert(ApsAlert.builder()
                                        .setTitle(title)
                                        .setBody(body)
                                        .build())
                                .setSound("default")
                                .setBadge(1)
                                .setContentAvailable(true)
                                .build())
                        .build())
                // Web push configuration - NO notification, only headers for priority
                .setWebpushConfig(WebpushConfig.builder()
                        .putHeader("Urgency", "high")
                        .putHeader("TTL", "86400")
                        // NO .setNotification() - service worker will show the notification
                        .build())
                // Data payload - service worker reads this to show notification
                .putData("title", title)
                .putData("body", body)
                .putData("sound", "default")
                .putData("click_action", "OPEN_TIMER")
                .putData("timestamp", String.valueOf(System.currentTimeMillis()))
                .build();
                
        try {
            String response = FirebaseMessaging.getInstance().send(message);
            log.info("✅ FCM push sent to user {}: {}", userId, response);
        } catch (FirebaseMessagingException e) {
            log.warn("❌ FCM push failed for user {}: {}", userId, e.getMessage());
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
        } catch (IllegalStateException e) {
            log.error("❌ Firebase not initialized - cannot send push notification to user {}: {}", userId, e.getMessage());
        } catch (Exception e) {
            log.error("❌ Unexpected error sending push notification to user {}: {}", userId, e.getMessage(), e);
        }
    }
}
