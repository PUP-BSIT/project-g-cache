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

    @Column(name = "long_break_duration")
    private Duration longBreakDuration;

    @Column(name = "long_break_interval")
    private Duration longBreakInterval;

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

    @OneToOne(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private SessionNote note;

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

    public void evaluateAbandonedIfExpired() {
        if (this.isDeleted || this.status == null) return;
        if (this.status == SessionStatus.COMPLETED || this.status == SessionStatus.ABANDONED) return;

        LocalDateTime reference = this.updatedAt != null ? this.updatedAt : this.startedAt;
        if (reference == null) return;

        if (reference.isBefore(LocalDateTime.now().minusHours(12))) {
            this.status = SessionStatus.ABANDONED;
        }
    }

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
            .breakDuration(breakDuration);

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
        Duration phaseDuration;
        if (currentPhase == CyclePhase.FOCUS) {
            phaseDuration = focusDuration;
        } else if (currentPhase == CyclePhase.LONG_BREAK && longBreakDuration != null) {
            phaseDuration = longBreakDuration;
        } else {
            phaseDuration = breakDuration;
        }
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

        this.elapsedTime = Duration.ZERO;
        this.startedAt = null;

        int completed = this.cyclesCompleted != null ? this.cyclesCompleted : 0;

        if (completed == 0 && this.currentPhase == CyclePhase.FOCUS) {
            this.status = SessionStatus.NOT_STARTED;
        } else {
            this.status = SessionStatus.PAUSED;
        }
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

        this.elapsedTime = Duration.ZERO;
        this.startedAt = LocalDateTime.now();

        if (this.currentPhase == CyclePhase.FOCUS) {
            if (shouldTriggerLongBreak()) {
                this.currentPhase = CyclePhase.LONG_BREAK;
            } else {
                this.currentPhase = CyclePhase.BREAK;
            }
        } else {
            this.currentPhase = CyclePhase.FOCUS;
            this.cyclesCompleted += 1;
        }

        checkCompletion();
        return this;
    }

    public void validateBreaks(Duration shortBreak, Duration longBreak, Duration interval) {
        long shortMin = shortBreak.toMinutes();
        if (shortMin < 2 || shortMin > 10) {
            throw new IllegalArgumentException("Short break must be between 2 and 10 minutes");
        }

        if (longBreak != null) {
            long longMin = longBreak.toMinutes();
            if (longMin < 15 || longMin > 30) {
                throw new IllegalArgumentException("Long break must be between 15 and 30 minutes");
            }

            if (interval == null || interval.toHours() < 3) {
                throw new IllegalArgumentException("Long break interval must be at least 3 hours");
            }
        }
    }

    private boolean shouldTriggerLongBreak() {
        if (this.longBreakDuration == null || this.longBreakInterval == null) return false;

        long cycleMinutes = focusDuration.toMinutes() + breakDuration.toMinutes();
        long cyclesPerLongBreak = this.longBreakInterval.toMinutes() / cycleMinutes;
        if (cyclesPerLongBreak < 1) cyclesPerLongBreak = 1;

        return (this.cyclesCompleted + 1) % cyclesPerLongBreak == 0;
    }

    private void checkCompletion() {
        if (this.totalCycles != null && this.cyclesCompleted >= this.totalCycles) {
            this.status = SessionStatus.COMPLETED;
            this.completedAt = LocalDateTime.now();
        }
    }

    public void skipPhase() {
        ensureActiveAndNotCompleted();

        if (this.sessionType != SessionType.FREESTYLE) {
            throw new IllegalStateException("Phase skipping is allowed only for FREESTYLE sessions");
        }

        if (this.currentPhase == CyclePhase.FOCUS) {
            this.currentPhase = CyclePhase.BREAK;
        } else {
            this.currentPhase = CyclePhase.FOCUS;
            this.cyclesCompleted = (this.cyclesCompleted != null ? this.cyclesCompleted : 0) + 1;
        }

        this.elapsedTime = Duration.ZERO;

        if (this.status == SessionStatus.IN_PROGRESS) {
            this.startedAt = LocalDateTime.now();
        }
    }

    public Duration calculateTotalElapsed() {
        Duration base = this.elapsedTime != null ? this.elapsedTime : Duration.ZERO;
        if (this.status == SessionStatus.IN_PROGRESS && this.startedAt != null) {
            return base.plus(Duration.between(this.startedAt, LocalDateTime.now()));
        }
        return base;
    }

    public void updateSettings(SessionType newType,
                               Duration newFocus,
                               Duration newBreak,
                               Integer newTotalCycles) {

        ensureActiveAndNotCompleted();

        Duration elapsed = calculateTotalElapsed();

        if (newFocus != null && this.currentPhase == CyclePhase.FOCUS && elapsed.compareTo(newFocus) > 0) {
            throw new IllegalArgumentException("Focus duration cannot be less than elapsed time");
        }
        if (newBreak != null && this.currentPhase == CyclePhase.BREAK && elapsed.compareTo(newBreak) > 0) {
            throw new IllegalArgumentException("Break duration cannot be less than elapsed time");
        }

        int completed = this.cyclesCompleted != null ? this.cyclesCompleted : 0;
        if (newTotalCycles != null && newTotalCycles < completed) {
            throw new IllegalArgumentException("Total cycles cannot be less than cycles completed");
        }

        if (newType != null && this.sessionType == SessionType.FREESTYLE
            && newType == SessionType.CLASSIC
                && (newTotalCycles == null && this.totalCycles == null)) {
            throw new IllegalArgumentException("Total cycles is required when switching to POMODORO");
        }

        if (newType != null) {
            this.sessionType = newType;
        }
        if (newFocus != null) {
            this.focusDuration = newFocus;
        }
        if (newBreak != null) {
            this.breakDuration = newBreak;
        }
        if (newTotalCycles != null) {
            this.totalCycles = newTotalCycles;
        }
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
