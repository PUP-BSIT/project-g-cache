package com.pomodify.backend.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

/**
 * Entity for storing scheduled push notifications.
 * Used to send notifications when timer completes, even if browser is closed.
 */
@Entity
@Table(name = "scheduled_push_notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScheduledPushNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "session_id")
    private Long sessionId;

    @Column(name = "activity_id")
    private Long activityId;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "body", nullable = false)
    private String body;

    @Column(name = "scheduled_at", nullable = false)
    private Instant scheduledAt;

    @Column(name = "sent", nullable = false)
    @Builder.Default
    private boolean sent = false;

    @Column(name = "cancelled", nullable = false)
    @Builder.Default
    private boolean cancelled = false;

    @Column(name = "notification_type")
    private String notificationType; // "PHASE_COMPLETE", "SESSION_COMPLETE"

    @Column(name = "current_phase")
    private String currentPhase; // "FOCUS", "BREAK"

    @Column(name = "created_at")
    @Builder.Default
    private Instant createdAt = Instant.now();

    public void markAsSent() {
        this.sent = true;
    }

    public void cancel() {
        this.cancelled = true;
    }

    public boolean shouldSend() {
        return !sent && !cancelled && Instant.now().isAfter(scheduledAt);
    }
}
