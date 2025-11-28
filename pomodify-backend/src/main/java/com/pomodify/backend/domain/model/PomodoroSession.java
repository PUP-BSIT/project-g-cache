package com.pomodify.backend.domain.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "pomodoro_session")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PomodoroSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ──────────────── References ────────────────
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "activity_id")
    private Activity activity;

    // ──────────────── Settings ────────────────
    @Column(name = "work_duration_minutes", nullable = false)
    private Integer workDurationMinutes;

    @Column(name = "break_duration_minutes", nullable = false)
    private Integer breakDurationMinutes;

    // ──────────────── State ────────────────
    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "is_completed", nullable = false)
    @Builder.Default
    private boolean isCompleted = false;

    @Column(name = "cycles_completed", nullable = false)
    @Builder.Default
    private Integer cyclesCompleted = 0;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    // ──────────────── Timestamps ────────────────
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ──────────────── Factory ────────────────
    public static PomodoroSession create(Long userId, Activity activity, Integer workMinutes, Integer breakMinutes) {
        if (userId == null)
            throw new IllegalArgumentException("User ID cannot be null");
        if (workMinutes == null || workMinutes <= 0)
            throw new IllegalArgumentException("Work duration must be positive");
        if (breakMinutes == null || breakMinutes <= 0)
            throw new IllegalArgumentException("Break duration must be positive");

        return PomodoroSession.builder()
                .userId(userId)
                .activity(activity)
                .workDurationMinutes(workMinutes)
                .breakDurationMinutes(breakMinutes)
                .isActive(true)
                .isCompleted(false)
                .cyclesCompleted(0)
                .build();
    }

    // ──────────────── Domain Logic ────────────────
    public void start() {
        ensureActive();
        if (startedAt != null)
            throw new IllegalStateException("Session already started");
        this.startedAt = LocalDateTime.now();
    }

    public void complete() {
        ensureActive();
        if (startedAt == null)
            throw new IllegalStateException("Cannot complete an unstarted session");
        if (isCompleted)
            throw new IllegalStateException("Session already completed");
        this.isCompleted = true;
        this.completedAt = LocalDateTime.now();
    }

    public void deactivate() {
        if (isCompleted)
            throw new IllegalStateException("Cannot deactivate a completed session");
        this.isActive = false;
    }

    public void incrementCycle() {
        ensureInProgress();
        this.cyclesCompleted++;
    }

    // ──────────────── Helpers ────────────────
    public boolean isInProgress() {
        return startedAt != null && !isCompleted && isActive;
    }

    public long getTotalDurationMinutes() {
        if (startedAt == null) return 0;
        LocalDateTime end = completedAt != null ? completedAt : LocalDateTime.now();
        return Duration.between(startedAt, end).toMinutes();
    }

    public boolean isStartedToday() {
        return startedAt != null && startedAt.toLocalDate().isEqual(LocalDate.now());
    }

    public boolean isCompletedToday() {
        return completedAt != null && completedAt.toLocalDate().isEqual(LocalDate.now());
    }

    // ──────────────── Guards ────────────────
    private void ensureActive() {
        if (!isActive)
            throw new IllegalStateException("Pomodoro Session is inactive");
    }

    private void ensureInProgress() {
        if (!isInProgress())
            throw new IllegalStateException("Pomodoro Session not in progress");
    }
}
