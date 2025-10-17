package com.pomodify.backend.domain.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Builder
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "pomodoro_session")
public class PomodoroSession {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "activity_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Activity activity;

    @Column(name = "work_duration_minutes", nullable = false)
    private Integer workDurationMinutes;

    @Column(name = "break_duration_minutes", nullable = false)
    private Integer breakDurationMinutes;

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

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private boolean isDeleted = false;

    // Domain methods for Pomodoro session management

    /**
     * Start this Pomodoro session.
     * Records the start time.
     */
    public void start() {
        if (startedAt != null) {
            throw new IllegalStateException("Session has already been started");
        }
        if (isDeleted) {
            throw new IllegalStateException("Cannot start a deleted session");
        }
        this.startedAt = LocalDateTime.now();
    }

    /**
     * Complete this Pomodoro session.
     * Marks the session as completed and records completion time.
     */
    public void complete() {
        if (startedAt == null) {
            throw new IllegalStateException("Cannot complete a session that hasn't been started");
        }
        if (isCompleted) {
            throw new IllegalStateException("Session is already completed");
        }
        if (isDeleted) {
            throw new IllegalStateException("Cannot complete a deleted session");
        }
        this.completedAt = LocalDateTime.now();
        this.isCompleted = true;
    }

    /**
     * Increment the number of completed Pomodoro cycles.
     */
    public void incrementCycle() {
        if (!isInProgress()) {
            throw new IllegalStateException("Cannot increment cycles for a session that is not in progress");
        }
        this.cyclesCompleted++;
    }

    /**
     * Set the number of completed cycles.
     * Useful when resuming or adjusting session progress.
     */
    public void setCycles(Integer cycles) {
        if (cycles == null || cycles < 0) {
            throw new IllegalArgumentException("Cycles must be a non-negative number");
        }
        this.cyclesCompleted = cycles;
    }

    /**
     * Abandon/cancel this session (soft delete).
     * Marks session as deleted without completing it.
     */
    public void abandon() {
        if (isCompleted) {
            throw new IllegalStateException("Cannot abandon a completed session");
        }
        this.isDeleted = true;
    }

    /**
     * Update work duration for this session.
     * Allows customization of Pomodoro length.
     */
    public void updateWorkDuration(Integer minutes) {
        if (minutes == null || minutes <= 0) {
            throw new IllegalArgumentException("Work duration must be positive");
        }
        if (isInProgress()) {
            throw new IllegalStateException("Cannot change work duration while session is in progress");
        }
        this.workDurationMinutes = minutes;
    }

    /**
     * Update break duration for this session.
     * Allows customization of break length.
     */
    public void updateBreakDuration(Integer minutes) {
        if (minutes == null || minutes <= 0) {
            throw new IllegalArgumentException("Break duration must be positive");
        }
        if (isInProgress()) {
            throw new IllegalStateException("Cannot change break duration while session is in progress");
        }
        this.breakDurationMinutes = minutes;
    }

    /**
     * Calculate total duration spent in this session (in minutes).
     * Returns time from start to completion, or start to now if in progress.
     */
    public long getTotalDurationMinutes() {
        if (startedAt == null) {
            return 0;
        }
        LocalDateTime endTime = completedAt != null ? completedAt : LocalDateTime.now();
        return java.time.Duration.between(startedAt, endTime).toMinutes();
    }

    /**
     * Calculate total planned work time (cycles * work duration).
     */
    public int getTotalPlannedWorkMinutes() {
        return cyclesCompleted * workDurationMinutes;
    }

    /**
     * Check if this session is currently in progress.
     * A session is in progress if it has started but not completed and not deleted.
     */
    public boolean isInProgress() {
        return startedAt != null && !isCompleted && !isDeleted;
    }

    /**
     * Check if this session is active (not soft-deleted).
     */
    public boolean isActive() {
        return !isDeleted;
    }

    /**
     * Check if this session was started today.
     */
    public boolean isStartedToday() {
        if (startedAt == null) {
            return false;
        }
        return startedAt.toLocalDate().isEqual(LocalDate.now());
    }

    /**
     * Check if this session was completed today.
     */
    public boolean isCompletedToday() {
        if (completedAt == null) {
            return false;
        }
        return completedAt.toLocalDate().isEqual(LocalDate.now());
    }

    /**
     * Get the activity this session belongs to.
     */
    public Activity getActivity() {
        return activity;
    }

    /**
     * Get the user who owns this session (through the activity).
     */
    public User getUser() {
        return activity != null ? activity.getUser() : null;
    }
    }
