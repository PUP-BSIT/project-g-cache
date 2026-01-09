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
import com.pomodify.backend.domain.model.settings.UserSettings;
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
        
        // Get user's sound preference
        String soundType = "bell"; // default
        boolean soundEnabled = true;
        if (settingsOpt.isPresent()) {
            UserSettings settings = settingsOpt.get();
            soundEnabled = settings.isNotificationSound();
            
            // Map backend enum to frontend sound file names
            if (settings.getSoundType() != null) {
                switch (settings.getSoundType()) {
                    case BELL -> soundType = "bell";
                    case CHIME -> soundType = "chime";
                    case DIGITAL_BEEP -> soundType = "digital";
                    case SOFT_DING -> soundType = "soft";
                }
            }
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
        
        log.info("📤 Sending FCM notification to user {} with token: {}... (sound: {}, type: {})", 
            userId, token.substring(0, Math.min(20, token.length())), soundEnabled, soundType);
        
        // Build the FCM message with proper sound configuration
        // 
        // For Web Push: We use data-only messages so the service worker has full control.
        // The service worker will show the notification and can trigger sound via postMessage.
        // 
        // For Android: Include notification payload with sound for native notification sound.
        // 
        // For iOS: Include APNS config with sound for native notification sound.
        Message message = Message.builder()
                .setToken(token)
                // Android configuration - include notification for native sound support
                .setAndroidConfig(AndroidConfig.builder()
                        .setPriority(AndroidConfig.Priority.HIGH)
                        .setNotification(AndroidNotification.builder()
                                .setTitle(title)
                                .setBody(body)
                                .setSound(soundEnabled ? "default" : null)
                                .setDefaultSound(soundEnabled)
                                .setChannelId("pomodify_timer")
                                .build())
                        .build())
                // iOS/APNs configuration for banner notification with sound
                .setApnsConfig(ApnsConfig.builder()
                        .putHeader("apns-priority", "10")
                        .putHeader("apns-push-type", "alert")
                        .setAps(Aps.builder()
                                .setAlert(ApsAlert.builder()
                                        .setTitle(title)
                                        .setBody(body)
                                        .build())
                                .setSound(soundEnabled ? "default" : null)
                                .setBadge(1)
                                .setContentAvailable(true)
                                .build())
                        .build())
                // Web push configuration - data only, service worker handles display
                // NO notification payload here to avoid duplicate notifications
                .setWebpushConfig(WebpushConfig.builder()
                        .putHeader("Urgency", "high")
                        .putHeader("TTL", "86400")
                        // Don't include notification here - service worker will handle it
                        .build())
                // Data payload - service worker reads this to show notification
                .putData("title", title)
                .putData("body", body)
                .putData("sound", soundEnabled ? "default" : "none")
                .putData("soundType", soundType)
                .putData("soundEnabled", String.valueOf(soundEnabled))
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
