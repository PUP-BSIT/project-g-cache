package com.pomodify.backend.domain.model;

import com.pomodify.backend.domain.valueobject.Email;
import jakarta.persistence.*;
import lombok.*;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

@Builder
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "app_user",
        uniqueConstraints = {
                @UniqueConstraint(name = "unique_username", columnNames = "username"),
                @UniqueConstraint(name = "unique_email", columnNames = "email"),
        })
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "username", nullable = false, unique = true)
    private String username;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "value", column = @Column(name = "email"))
    })
    private Email email;

    @Builder.Default
    @Column(name = "is_email_verified", nullable = false)
    private boolean isEmailVerified = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Date createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Date updatedAt;

     @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
     @Builder.Default
     private List<Activity> activities = new ArrayList<>();

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private boolean isDeleted = false;

    // Domain methods for managing activities (aggregate boundary)

    /**
     * Add a new activity to this user's activity list.
     * Maintains bidirectional relationship consistency.
     */
    public void addActivity(Activity activity) {
        if (activity == null) {
            throw new IllegalArgumentException("Activity cannot be null");
        }
        activities.add(activity);
        activity.setUser(this);
    }

    /**
     * Soft delete an activity owned by this user.
     * Marks the activity as deleted without physically removing it from the database.
     */
    public void deleteActivity(Activity activity) {
        if (activity == null) {
            throw new IllegalArgumentException("Activity cannot be null");
        }
        if (!activities.contains(activity)) {
            throw new IllegalStateException("Activity does not belong to this user");
        }
        activity.setDeleted(true);
    }

    /**
     * Restore a soft-deleted activity owned by this user.
     * Marks the activity as active again.
     */
    public void restoreActivity(Activity activity) {
        if (activity == null) {
            throw new IllegalArgumentException("Activity cannot be null");
        }
        if (!activities.contains(activity)) {
            throw new IllegalStateException("Activity does not belong to this user");
        }
        activity.setDeleted(false);
    }

    /**
     * Get only active (non-deleted) activities.
     * Domain query method.
     */
    public List<Activity> getActiveActivities() {
        return activities.stream()
                .filter(activity -> !activity.isDeleted())
                .collect(Collectors.toList());
    }

    /**
     * Get activities scheduled for a specific date.
     */
    public List<Activity> getActivitiesScheduledOn(Date date) {
        if (date == null) {
            throw new IllegalArgumentException("Date cannot be null");
        }
        return activities.stream()
                .filter(activity -> !activity.isDeleted())
                .filter(activity -> isSameDay(activity.getScheduledAt(), date))
                .collect(Collectors.toList());
    }

    /**
     * Count active activities for this user.
     */
    public long countActiveActivities() {
        return activities.stream()
                .filter(activity -> !activity.isDeleted())
                .count();
    }

    /**
     * Verify the user's email.
     * Domain operation.
     */
    public void verifyEmail() {
        this.isEmailVerified = true;
    }

    /**
     * Soft delete this user.
     * Domain operation.
     */
    public void delete() {
        this.isDeleted = true;
        // Optionally cascade soft delete to all activities
        activities.forEach(activity -> activity.setDeleted(true));
    }

    /**
     * Check if user is active (not deleted).
     */
    public boolean isActive() {
        return !isDeleted;
    }

    /**
     * Update user's email.
     * When email changes, verification should be reset.
     */
    public void updateEmail(Email newEmail) {
        if (newEmail == null) {
            throw new IllegalArgumentException("Email cannot be null");
        }
        if (!this.email.equals(newEmail)) {
            this.email = newEmail;
            this.isEmailVerified = false;
        }
    }

    // Helper method for date comparison
    private boolean isSameDay(Date date1, Date date2) {
        if (date1 == null || date2 == null) {
            return false;
        }
        // Simple day comparison - you might want to use a proper date library
        long diff = Math.abs(date1.getTime() - date2.getTime());
        return diff < 24 * 60 * 60 * 1000;
    }
}
