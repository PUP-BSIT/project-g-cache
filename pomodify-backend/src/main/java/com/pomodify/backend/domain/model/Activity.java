package com.pomodify.backend.domain.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Builder
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "activity")
public class Activity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "scheduled_at")
    private LocalDateTime scheduledAt;

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User user;

    @OneToMany(mappedBy = "activity", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @Builder.Default
    private List<PomodoroSession> sessions = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private boolean isDeleted = false;

    // Domain methods for Pomodoro activity management

    /**
     * Rename this activity.
     * Domain operation for updating activity title.
     */
    public void rename(String newTitle) {
        if (newTitle == null || newTitle.trim().isEmpty()) {
            throw new IllegalArgumentException("Activity title cannot be null or empty");
        }
        this.title = newTitle.trim();
    }

    /**
     * Update activity description.
     * Allows users to add context or goals for this activity.
     */
    public void updateDescription(String newDescription) {
        this.description = newDescription;
    }

    /**
     * Schedule this activity for a specific date/time.
     * Useful for planning when to work on this activity.
     */
    public void scheduleFor(LocalDateTime scheduledAt) {
        this.scheduledAt = scheduledAt;
    }

    /**
     * Clear the schedule for this activity.
     */
    public void clearSchedule() {
        this.scheduledAt = null;
    }

    /**
     * Set estimated total duration for this activity in minutes.
     * Helps users plan how much time they expect to spend.
     */
    public void setEstimatedDuration(Integer durationMinutes) {
        if (durationMinutes != null && durationMinutes <= 0) {
            throw new IllegalArgumentException("Duration must be positive");
        }
        this.durationMinutes = durationMinutes;
    }

    // Pomodoro session management methods

    /**
     * Add a new Pomodoro session to this activity.
     * Maintains bidirectional relationship consistency.
     */
    public void addSession(PomodoroSession session) {
        if (session == null) {
            throw new IllegalArgumentException("Session cannot be null");
        }
        sessions.add(session);
        session.setActivity(this);
    }

    /**
     * Get all active (non-deleted) Pomodoro sessions for this activity.
     */
    public List<PomodoroSession> getActiveSessions() {
        return sessions.stream()
                .filter(PomodoroSession::isActive)
                .collect(Collectors.toList());
    }

    /**
     * Get all completed Pomodoro sessions for this activity.
     */
    public List<PomodoroSession> getCompletedSessions() {
        return sessions.stream()
                .filter(PomodoroSession::isActive)
                .filter(PomodoroSession::isCompleted)
                .collect(Collectors.toList());
    }

    /**
     * Get sessions completed today for this activity.
     */
    public List<PomodoroSession> getSessionsCompletedToday() {
        return sessions.stream()
                .filter(PomodoroSession::isActive)
                .filter(PomodoroSession::isCompletedToday)
                .collect(Collectors.toList());
    }

    /**
     * Count total completed sessions for this activity.
     */
    public long countCompletedSessions() {
        return sessions.stream()
                .filter(PomodoroSession::isActive)
                .filter(PomodoroSession::isCompleted)
                .count();
    }

    /**
     * Calculate total time spent on this activity (sum of all completed session durations).
     */
    public long getTotalTimeSpentMinutes() {
        return sessions.stream()
                .filter(PomodoroSession::isActive)
                .filter(PomodoroSession::isCompleted)
                .mapToLong(PomodoroSession::getTotalDurationMinutes)
                .sum();
    }

    /**
     * Calculate total Pomodoro cycles completed for this activity.
     */
    public int getTotalCyclesCompleted() {
        return sessions.stream()
                .filter(PomodoroSession::isActive)
                .filter(PomodoroSession::isCompleted)
                .mapToInt(PomodoroSession::getCyclesCompleted)
                .sum();
    }

    /**
     * Check if there's a session currently in progress for this activity.
     */
    public boolean hasSessionInProgress() {
        return sessions.stream()
                .anyMatch(PomodoroSession::isInProgress);
    }

    /**
     * Get the current session in progress, if any.
     */
    public PomodoroSession getCurrentSession() {
        return sessions.stream()
                .filter(PomodoroSession::isInProgress)
                .findFirst()
                .orElse(null);
    }

    // Activity status methods

    /**
     * Check if this activity is active (not soft-deleted).
     */
    public boolean isActive() {
        return !isDeleted;
    }

    /**
     * Check if this activity is scheduled.
     */
    public boolean isScheduled() {
        return scheduledAt != null && !isDeleted;
    }

    /**
     * Check if this activity is scheduled for today.
     */
    public boolean isScheduledForToday() {
        if (scheduledAt == null || isDeleted) {
            return false;
        }
        return scheduledAt.toLocalDate().isEqual(LocalDate.now());
    }

    /**
     * Check if this activity is scheduled for a future date.
     */
    public boolean isScheduledForFuture() {
        if (scheduledAt == null || isDeleted) {
            return false;
        }
        return scheduledAt.isAfter(LocalDateTime.now());
    }

    /**
     * Check if this activity is overdue (scheduled in the past).
     */
    public boolean isOverdue() {
        if (scheduledAt == null || isDeleted) {
            return false;
        }
        LocalDateTime now = LocalDateTime.now();
        return scheduledAt.isBefore(now) && !scheduledAt.toLocalDate().isEqual(now.toLocalDate());
    }
}
