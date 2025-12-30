package com.pomodify.backend.domain.repository;

import com.pomodify.backend.domain.model.ScheduledPushNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface ScheduledPushNotificationRepository extends JpaRepository<ScheduledPushNotification, Long> {

    /**
     * Find all notifications that are due to be sent
     */
    @Query("SELECT n FROM ScheduledPushNotification n WHERE n.sent = false AND n.cancelled = false AND n.scheduledAt <= :now")
    List<ScheduledPushNotification> findDueNotifications(@Param("now") Instant now);

    /**
     * Find pending notifications for a specific session
     */
    List<ScheduledPushNotification> findBySessionIdAndSentFalseAndCancelledFalse(Long sessionId);

    /**
     * Find pending notifications for a user
     */
    List<ScheduledPushNotification> findByUserIdAndSentFalseAndCancelledFalse(Long userId);

    /**
     * Cancel all pending notifications for a session
     */
    @Modifying
    @Query("UPDATE ScheduledPushNotification n SET n.cancelled = true WHERE n.sessionId = :sessionId AND n.sent = false AND n.cancelled = false")
    int cancelBySessionId(@Param("sessionId") Long sessionId);

    /**
     * Cancel all pending notifications for a user
     */
    @Modifying
    @Query("UPDATE ScheduledPushNotification n SET n.cancelled = true WHERE n.userId = :userId AND n.sent = false AND n.cancelled = false")
    int cancelByUserId(@Param("userId") Long userId);

    /**
     * Delete old sent/cancelled notifications (cleanup)
     */
    @Modifying
    @Query("DELETE FROM ScheduledPushNotification n WHERE (n.sent = true OR n.cancelled = true) AND n.createdAt < :before")
    int deleteOldNotifications(@Param("before") Instant before);
}
