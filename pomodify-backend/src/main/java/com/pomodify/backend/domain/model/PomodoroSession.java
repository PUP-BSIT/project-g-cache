package com.pomodify.backend.domain.model;

import com.pomodify.backend.domain.enums.CyclePhase;
import com.pomodify.backend.domain.enums.SessionStatus;
import com.pomodify.backend.domain.enums.SessionType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Duration;
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


    @Column(name = "session_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private SessionType sessionType;

    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    private SessionStatus status;

    @Column(name = "focus_duration", nullable = false)
    private Duration focusDuration;

    @Column(name = "break_duration", nullable = false)
    private Duration breakDuration;

    @Column(name = "total_cycles")
    private Integer totalCycles;

    @Transient
    private Duration elapsedTime = Duration.ZERO;

    @Transient
    private Duration cycleDuration;

    @Transient
    private Duration totalDuration;

    @Column(name = "current_phase")
    @Enumerated(EnumType.STRING)
    private CyclePhase currentPhase;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String note;

    // ──────────────── References ────────────────
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "activity_id")
    private Activity activity;

    // ──────────────── State ────────────────
    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "cycles_completed", nullable = false)
    @Builder.Default
    private Integer cyclesCompleted = 0;

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private boolean isDeleted = false;

    // ──────────────── Timestamps ────────────────
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ──────────────── Factory ────────────────
    public static PomodoroSession create(Activity activity, SessionType sessionType, Duration focusDuration, Duration breakDuration, Integer totalCycles, String note) {
        if (activity == null)
            throw new IllegalArgumentException("Activity cannot be null");
        if (sessionType == null)
            throw new IllegalArgumentException("Session type cannot be null");
        if (focusDuration == null || focusDuration.isNegative() || focusDuration.isZero())
            throw new IllegalArgumentException("Focus duration must be positive");
        if (breakDuration == null || breakDuration.isNegative() || breakDuration.isZero())
            throw new IllegalArgumentException("Break duration must be positive");

        PomodoroSession.PomodoroSessionBuilder builder = PomodoroSession.builder()
                .activity(activity)
                .sessionType(sessionType)
                .status(SessionStatus.NOT_STARTED)
                .currentPhase(CyclePhase.FOCUS)
                .focusDuration(focusDuration)
                .breakDuration(breakDuration)
                .note(note != null && !note.isBlank() ? note.trim() : null);

        if (totalCycles != null) {
            builder.totalCycles(totalCycles);
            builder.cycleDuration(focusDuration.plus(breakDuration));
            builder.totalDuration(focusDuration.plus(breakDuration).multipliedBy(totalCycles));
        }

        return builder.build();
    }

    // --------------- Methods ---------------
    public Duration getTotalDuration() {
        return totalCycles != null
                ? focusDuration.plus(breakDuration).multipliedBy(totalCycles)
                : Duration.ZERO;
    }

    public Duration getCycleDuration() {
        return focusDuration.plus(breakDuration);
    }

    public Duration getRemainingTime() {
        Duration phaseDuration = (currentPhase == CyclePhase.FOCUS) ? focusDuration : breakDuration;
        Duration timeSpent = elapsedTime;

        if (status == SessionStatus.IN_PROGRESS && startedAt != null) {
            timeSpent = timeSpent.plus(Duration.between(startedAt, LocalDateTime.now()));
        }

        return phaseDuration.minus(timeSpent);
    }

    // ──────────────── Domain Logic ────────────────
    public void startSession() {
        ensureActiveAndNotCompleted();

        if (this.status != SessionStatus.NOT_STARTED) {
            throw new IllegalStateException("Pomodoro Session has already been started");
        }

        this.status = SessionStatus.IN_PROGRESS;
        this.startedAt = LocalDateTime.now();
    }

    public void resumeSession() {
        ensureActiveAndNotCompleted();

        if (this.status != SessionStatus.PAUSED) {
            throw new IllegalStateException("Pomodoro Session is not paused and cannot be resumed");
        }

        this.status = SessionStatus.IN_PROGRESS;
        this.startedAt = LocalDateTime.now();
    }

    public void pauseSession() {
        ensureActiveAndNotCompleted();

        if (this.status != SessionStatus.IN_PROGRESS) {
            throw new IllegalStateException("Pomodoro Session is not in progress and cannot be paused");
        }

        this.status = SessionStatus.PAUSED;
        this.elapsedTime = this.elapsedTime.plus(Duration.between(this.startedAt, LocalDateTime.now()));
    }

    public void stopSession() {
        ensureActiveAndNotCompleted();

        if (this.status != SessionStatus.IN_PROGRESS && this.status != SessionStatus.PAUSED) {
            throw new IllegalStateException("Pomodoro Session is neither in progress nor paused and cannot be stopped");
        }

        // Stopping invalidates the current cycle - do not count it
        // Reset to NOT_STARTED to allow restarting
        this.status = SessionStatus.NOT_STARTED;
        this.currentPhase = CyclePhase.FOCUS;
        this.elapsedTime = Duration.ZERO;
        this.startedAt = null;
    }

    public void cancelSession() {
        ensureActive();

        if (this.status == SessionStatus.COMPLETED || this.status == SessionStatus.CANCELED) {
            throw new IllegalStateException("Pomodoro Session is already " + this.status);
        }

        // Canceling invalidates all cycles
        this.status = SessionStatus.CANCELED;
        this.completedAt = LocalDateTime.now();
        this.cyclesCompleted = 0;
        this.elapsedTime = Duration.ZERO;
    }

    public void completeSession() {
        ensureActiveAndNotCompleted();

        this.status = SessionStatus.COMPLETED;
        this.completedAt = LocalDateTime.now();
    }

    public PomodoroSession delete() {
        this.isDeleted = true;
        return this;
    }

    public PomodoroSession completeCyclePhase () {
        ensureActiveAndNotCompleted();

        if (this.currentPhase == CyclePhase.FOCUS) {
            this.currentPhase = CyclePhase.BREAK;
        } else if (this.currentPhase == CyclePhase.BREAK) {
            this.currentPhase = CyclePhase.FOCUS;
            this.cyclesCompleted += 1;
        }

        // Check if session is completed
        if (this.totalCycles != null && this.cyclesCompleted >= this.totalCycles) {
            this.status = SessionStatus.COMPLETED;
            this.completedAt = LocalDateTime.now();
        }

        return this;
    }

    // ──────────────── Guards ────────────────
    private void ensureActive() {
        if (isDeleted)
            throw new IllegalStateException("Pomodoro Session is inactive");
    }

    private void ensureNotCompleted() {
        if (SessionStatus.COMPLETED.equals(this.status))
            throw new IllegalStateException("Pomodoro Session is already completed");
    }

    private void ensureActiveAndNotCompleted() {
        ensureActive();
        ensureNotCompleted();
    }

}
