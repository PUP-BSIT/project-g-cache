package com.pomodify.backend.application.service;

import com.pomodify.backend.domain.model.ScheduledPushNotification;
import com.pomodify.backend.domain.repository.ScheduledPushNotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Service for managing scheduled push notifications.
 * Allows scheduling notifications to be sent at a future time,
 * enabling true mobile push notifications even when browser is closed.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduledPushService {

    private final ScheduledPushNotificationRepository repository;
    private final PushNotificationService pushNotificationService;

    /**
     * Schedule a push notification for a specific time
     */
    @Transactional
    public ScheduledPushNotification scheduleNotification(
            Long userId,
            Long sessionId,
            Long activityId,
            String title,
            String body,
            Instant scheduledAt,
            String notificationType,
            String currentPhase
    ) {
        // Cancel any existing pending notifications for this session
        if (sessionId != null) {
            repository.cancelBySessionId(sessionId);
        }

        ScheduledPushNotification notification = ScheduledPushNotification.builder()
                .userId(userId)
                .sessionId(sessionId)
                .activityId(activityId)
                .title(title)
                .body(body)
                .scheduledAt(scheduledAt)
                .notificationType(notificationType)
                .currentPhase(currentPhase)
                .build();

        ScheduledPushNotification saved = repository.save(notification);
        log.info("Scheduled push notification for user {} at {}: {}", userId, scheduledAt, title);
        return saved;
    }

    /**
     * Cancel all pending notifications for a session (e.g., when user pauses or stops)
     */
    @Transactional
    public void cancelSessionNotifications(Long sessionId) {
        int cancelled = repository.cancelBySessionId(sessionId);
        if (cancelled > 0) {
            log.info("Cancelled {} pending notifications for session {}", cancelled, sessionId);
        }
    }

    /**
     * Cancel all pending notifications for a user
     */
    @Transactional
    public void cancelUserNotifications(Long userId) {
        int cancelled = repository.cancelByUserId(userId);
        if (cancelled > 0) {
            log.info("Cancelled {} pending notifications for user {}", cancelled, userId);
        }
    }

    /**
     * Process due notifications - runs every 5 seconds
     */
    @Scheduled(fixedRate = 5000)
    @Transactional
    public void processDueNotifications() {
        List<ScheduledPushNotification> dueNotifications = repository.findDueNotifications(Instant.now());
        
        for (ScheduledPushNotification notification : dueNotifications) {
            try {
                pushNotificationService.sendNotificationToUser(
                        notification.getUserId(),
                        notification.getTitle(),
                        notification.getBody()
                );
                notification.markAsSent();
                repository.save(notification);
                log.info("Sent scheduled notification {} to user {}", notification.getId(), notification.getUserId());
            } catch (Exception e) {
                log.error("Failed to send scheduled notification {}: {}", notification.getId(), e.getMessage());
                // Don't mark as sent - will retry on next cycle
            }
        }
    }

    /**
     * Cleanup old notifications - runs daily at 3 AM
     */
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void cleanupOldNotifications() {
        Instant oneWeekAgo = Instant.now().minus(7, ChronoUnit.DAYS);
        int deleted = repository.deleteOldNotifications(oneWeekAgo);
        if (deleted > 0) {
            log.info("Cleaned up {} old scheduled notifications", deleted);
        }
    }

    /**
     * Get pending notifications for a session
     */
    public List<ScheduledPushNotification> getPendingForSession(Long sessionId) {
        return repository.findBySessionIdAndSentFalseAndCancelledFalse(sessionId);
    }
}
