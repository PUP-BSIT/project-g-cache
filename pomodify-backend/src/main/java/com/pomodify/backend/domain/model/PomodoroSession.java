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

    @Column(name = "session_title", nullable = false)
    @Builder.Default
    private String sessionTitle = "Session";

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

    @Column(name = "long_break_interval_cycles")
    private Integer longBreakIntervalCycles;

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
    private String notes;

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

    @Column(name = "phase_started_at")
    private LocalDateTime phaseStartedAt;

    @Column(name = "total_paused_duration_seconds")
    @Builder.Default
    private Long totalPausedDurationSeconds = 0L;

    @Column(name = "remaining_seconds_at_pause")
    private Long remainingSecondsAtPause;

    @Column(name = "phase_end_time")
    private LocalDateTime phaseEndTime;

    @Column(name = "phase_notified")
    @Builder.Default
    private Boolean phaseNotified = false;

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
                .sessionTitle("Session")
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
        Duration phaseDuration = getCurrentPhaseDuration();
        
        // If paused and we have stored remaining time, return it
        if (status == SessionStatus.PAUSED && remainingSecondsAtPause != null) {
            return Duration.ofSeconds(remainingSecondsAtPause);
        }
        
        // If paused without stored remaining time (e.g., after phase completion),
        // return full phase duration since the new phase hasn't started yet
        if (status == SessionStatus.PAUSED) {
            return phaseDuration;
        }
        
        // If not in progress or no phase start time, return full phase duration
        if (status != SessionStatus.IN_PROGRESS || phaseStartedAt == null) {
            return phaseDuration;
        }

        // Calculate elapsed time in current phase
        Duration elapsedInPhase = Duration.between(phaseStartedAt, LocalDateTime.now());
        
        Duration remaining = phaseDuration.minus(elapsedInPhase);
        return remaining.isNegative() ? Duration.ZERO : remaining;
    }

    public Duration getCurrentPhaseDuration() {
        if (currentPhase == CyclePhase.FOCUS) {
            return focusDuration;
        } else if (currentPhase == CyclePhase.LONG_BREAK && longBreakDuration != null) {
            return longBreakDuration;
        } else {
            return breakDuration;
        }
    }

    public long getRemainingPhaseSeconds() {
        return getRemainingTime().getSeconds();
    }

    // ──────────────── Domain Logic ────────────────
    public void startSession() {
        ensureActiveAndNotCompleted();

        if (this.status != SessionStatus.NOT_STARTED) {
            throw new IllegalStateException("Pomodoro Session has already been started");
        }

        this.status = SessionStatus.IN_PROGRESS;
        this.startedAt = LocalDateTime.now();
        this.phaseStartedAt = LocalDateTime.now();
        this.totalPausedDurationSeconds = 0L;
        
        // Calculate phase end time for backend notifications
        this.phaseEndTime = this.phaseStartedAt.plusSeconds(getCurrentPhaseDuration().getSeconds());
        this.phaseNotified = false;
    }

    public void resumeSession() {
        ensureActiveAndNotCompleted();

        if (this.status != SessionStatus.PAUSED) {
            throw new IllegalStateException("Pomodoro Session is not paused and cannot be resumed");
        }

        this.status = SessionStatus.IN_PROGRESS;
        
        // Reset phase start time based on remaining time at pause
        if (this.remainingSecondsAtPause != null) {
            Duration phaseDuration = getCurrentPhaseDuration();
            long elapsedSeconds = phaseDuration.getSeconds() - this.remainingSecondsAtPause;
            this.phaseStartedAt = LocalDateTime.now().minusSeconds(elapsedSeconds);
            
            // Calculate new phase end time based on remaining seconds
            this.phaseEndTime = LocalDateTime.now().plusSeconds(this.remainingSecondsAtPause);
        } else {
            this.phaseStartedAt = LocalDateTime.now();
            this.phaseEndTime = this.phaseStartedAt.plusSeconds(getCurrentPhaseDuration().getSeconds());
        }
        
        // Reset notification flag for resumed phase
        this.phaseNotified = false;
        
        // Clear the stored remaining time
        this.remainingSecondsAtPause = null;
    }

    public void pauseSession() {
        ensureActiveAndNotCompleted();

        if (this.status != SessionStatus.IN_PROGRESS) {
            throw new IllegalStateException("Pomodoro Session is not in progress and cannot be paused");
        }

        // Store the remaining time before changing status
        this.remainingSecondsAtPause = getRemainingTime().getSeconds();
        
        this.status = SessionStatus.PAUSED;
        
        // Clear phase end time since timer is paused (no notification needed)
        this.phaseEndTime = null;
    }

    public void stopSession() {
        ensureActiveAndNotCompleted();

        this.elapsedTime = Duration.ZERO;
        this.startedAt = null;
        this.status = SessionStatus.ABANDONED;
    }

    public void completeEarly() {
        ensureActiveAndNotCompleted();

        int completed = this.cyclesCompleted != null ? this.cyclesCompleted : 0;

        // Mark as COMPLETED if at least 1 focus phase is completed.
        // This means either we have completed full cycles, OR we are currently in a BREAK/LONG_BREAK phase (meaning the preceding FOCUS is done).
        if (completed >= 1 || this.currentPhase != CyclePhase.FOCUS) {
            this.status = SessionStatus.COMPLETED;
            this.completedAt = LocalDateTime.now();
        } else {
            this.status = SessionStatus.NOT_STARTED;
            this.startedAt = null;
            this.elapsedTime = Duration.ZERO;
            this.cyclesCompleted = 0;
            this.currentPhase = CyclePhase.FOCUS;
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

        System.out.println("[DEBUG] completeCyclePhase: currentPhase=" + this.currentPhase + 
            ", cyclesCompleted=" + this.cyclesCompleted +
            ", longBreakDuration=" + this.longBreakDuration +
            ", longBreakIntervalCycles=" + this.longBreakIntervalCycles);

        // Reset elapsed time for new phase but DON'T start the timer
        // Frontend controls when the next phase starts (user must press Start/Resume)
        this.elapsedTime = Duration.ZERO;
        this.totalPausedDurationSeconds = 0L;
        this.remainingSecondsAtPause = null;
        
        // Clear the phase start time - will be set when user starts the phase
        this.phaseStartedAt = null;
        this.phaseEndTime = null;

        if (this.currentPhase == CyclePhase.FOCUS) {
            if (shouldTriggerLongBreak()) {
                this.currentPhase = CyclePhase.LONG_BREAK;
                System.out.println("[DEBUG] completeCyclePhase: Transitioning to LONG_BREAK");
            } else {
                this.currentPhase = CyclePhase.BREAK;
                System.out.println("[DEBUG] completeCyclePhase: Transitioning to BREAK");
            }
        } else {
            this.currentPhase = CyclePhase.FOCUS;
            this.cyclesCompleted += 1;
            System.out.println("[DEBUG] completeCyclePhase: Transitioning to FOCUS, cyclesCompleted now=" + this.cyclesCompleted);
        }

        // Reset notification flag for new phase
        this.phaseNotified = false;
        
        // Set status to PAUSED so user must explicitly start the next phase
        this.status = SessionStatus.PAUSED;

        checkCompletion();
        return this;
    }

    /**
     * Complete the current phase and automatically start the next phase.
     * Used by the backend scheduler for background notifications when user has closed the browser.
     * Unlike completeCyclePhase(), this keeps the session IN_PROGRESS and sets up the next phase timer.
     * 
     * @return this session for chaining
     */
    public PomodoroSession completeCyclePhaseAndContinue() {
        ensureActiveAndNotCompleted();

        // Reset elapsed time for new phase
        this.elapsedTime = Duration.ZERO;
        this.totalPausedDurationSeconds = 0L;
        this.remainingSecondsAtPause = null;

        // Advance to next phase
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

        // Check if session is now complete (only for Classic sessions)
        // Freestyle sessions never auto-complete - they run until user manually completes
        if (this.sessionType != SessionType.FREESTYLE && 
            this.totalCycles != null && this.cyclesCompleted >= this.totalCycles) {
            this.status = SessionStatus.COMPLETED;
            this.completedAt = LocalDateTime.now();
            this.phaseStartedAt = null;
            this.phaseEndTime = null;
            this.phaseNotified = false;
        } else {
            // Keep session running - set up the next phase timer
            this.status = SessionStatus.IN_PROGRESS;
            this.phaseStartedAt = LocalDateTime.now();
            this.phaseEndTime = this.phaseStartedAt.plusSeconds(getCurrentPhaseDuration().getSeconds());
            this.phaseNotified = false;
        }

        return this;
    }

    public void validateBreaks(Duration shortBreak, Duration longBreak, Duration interval, Integer intervalCycles) {
        long shortMin = shortBreak.toMinutes();
        if (shortMin < 2 || shortMin > 10) {
            throw new IllegalArgumentException("Short break must be between 2 and 10 minutes");
        }

        if (longBreak != null) {
            long longMin = longBreak.toMinutes();
            if (longMin < 15 || longMin > 30) {
                throw new IllegalArgumentException("Long break must be between 15 and 30 minutes");
            }

            // Validate cycle-based interval if provided
            if (intervalCycles != null) {
                if (intervalCycles < 2 || intervalCycles > 10) {
                    throw new IllegalArgumentException("Long break interval must be between 2 and 10 cycles");
                }
            } else if (interval == null || interval.toHours() < 3) {
                // Fallback to time-based validation for backward compatibility
                throw new IllegalArgumentException("Long break interval must be at least 3 hours");
            }
        }
    }

    /**
     * @deprecated Use {@link #validateBreaks(Duration, Duration, Duration, Integer)} instead
     */
    @Deprecated
    public void validateBreaks(Duration shortBreak, Duration longBreak, Duration interval) {
        validateBreaks(shortBreak, longBreak, interval, null);
    }

    private boolean shouldTriggerLongBreak() {
        if (this.longBreakDuration == null) {
            System.out.println("[DEBUG] shouldTriggerLongBreak: longBreakDuration is null, returning false");
            return false;
        }
        
        // Use cycle-based interval if available (new approach)
        if (this.longBreakIntervalCycles != null) {
            boolean shouldTrigger = (this.cyclesCompleted + 1) % this.longBreakIntervalCycles == 0;
            System.out.println("[DEBUG] shouldTriggerLongBreak: cyclesCompleted=" + this.cyclesCompleted + 
                ", intervalCycles=" + this.longBreakIntervalCycles + 
                ", (cyclesCompleted+1) % intervalCycles = " + ((this.cyclesCompleted + 1) % this.longBreakIntervalCycles) +
                ", shouldTrigger=" + shouldTrigger);
            return shouldTrigger;
        }
        
        System.out.println("[DEBUG] shouldTriggerLongBreak: longBreakIntervalCycles is null, falling back to time-based");
        
        // Fallback to time-based interval for backward compatibility
        if (this.longBreakInterval == null) return false;
        
        long cycleMinutes = focusDuration.toMinutes() + breakDuration.toMinutes();
        long cyclesPerLongBreak = this.longBreakInterval.toMinutes() / cycleMinutes;
        if (cyclesPerLongBreak < 1) cyclesPerLongBreak = 1;

        return (this.cyclesCompleted + 1) % cyclesPerLongBreak == 0;
    }

    private void checkCompletion() {
        // Freestyle sessions should never auto-complete - they run until user manually completes
        if (this.sessionType == SessionType.FREESTYLE) {
            return;
        }
        
        // Check if session has reached its cycle limit (Classic sessions only)
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
        this.totalPausedDurationSeconds = 0L;

        if (this.status == SessionStatus.IN_PROGRESS) {
            this.startedAt = LocalDateTime.now();
            this.phaseStartedAt = LocalDateTime.now();
        }
    }

    /**
     * Reset session to initial state (NOT_STARTED).
     * Clears all progress but keeps session configuration.
     */
    public void resetSession() {
        // Can only reset if not already completed or abandoned
        if (this.status == SessionStatus.COMPLETED) {
            throw new IllegalStateException("Cannot reset a completed session");
        }
        if (this.status == SessionStatus.ABANDONED) {
            throw new IllegalStateException("Cannot reset an abandoned session");
        }

        // Reset to initial state
        this.status = SessionStatus.NOT_STARTED;
        this.currentPhase = CyclePhase.FOCUS;
        this.cyclesCompleted = 0;
        this.elapsedTime = Duration.ZERO;
        this.totalPausedDurationSeconds = 0L;
        this.startedAt = null;
        this.phaseStartedAt = null;
        this.remainingSecondsAtPause = null;
        this.phaseEndTime = null;
        this.phaseNotified = false;
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
