package com.pomodify.backend.domain.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.util.Date;

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
    private Date scheduledAt;

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User user;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Date createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Date updatedAt;

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
    public void scheduleFor(Date scheduledAt) {
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
        Date now = new Date();
        return isSameDay(scheduledAt, now);
    }

    /**
     * Check if this activity is scheduled for a future date.
     */
    public boolean isScheduledForFuture() {
        if (scheduledAt == null || isDeleted) {
            return false;
        }
        return scheduledAt.after(new Date());
    }

    /**
     * Check if this activity is overdue (scheduled in the past).
     */
    public boolean isOverdue() {
        if (scheduledAt == null || isDeleted) {
            return false;
        }
        Date now = new Date();
        return scheduledAt.before(now) && !isSameDay(scheduledAt, now);
    }

    // Helper method for date comparison
    private boolean isSameDay(Date date1, Date date2) {
        if (date1 == null || date2 == null) {
            return false;
        }
        long diff = Math.abs(date1.getTime() - date2.getTime());
        return diff < 24 * 60 * 60 * 1000;
    }
}
