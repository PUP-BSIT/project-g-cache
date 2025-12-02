package com.pomodify.backend.domain.model;

import com.pomodify.backend.domain.valueobject.Email;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Set;
import java.util.TreeSet;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "app_user",
        uniqueConstraints = {
                @UniqueConstraint(name = "unique_email", columnNames = "email")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ──────────────── Core ────────────────
    @Column(name = "first_name", nullable = false)
    private String firstName;

    @Column(name = "last_name", nullable = false)
    private String lastName;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "value", column = @Column(name = "email", nullable = false, unique = true))
    })
    private Email email;

    // ──────────────── State ────────────────
    @Column(name = "is_email_verified", nullable = false)
    @Builder.Default
    private boolean isEmailVerified = false;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    // ──────────────── Relationships ────────────────
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    @Builder.Default
    private List<Category> categories = new ArrayList<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    @Builder.Default
    private List<Activity> activities = new ArrayList<>();


    // ──────────────── Timestamps ────────────────
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ──────────────── Domain Logic ────────────────
    public void verifyEmail() {
        ensureActive();
        this.isEmailVerified = true;
    }

    public void updateEmail(Email newEmail) {
        ensureActive();
        if (newEmail == null)
            throw new IllegalArgumentException("Email cannot be null");

        if (!newEmail.equals(this.email)) {
            this.email = newEmail;
            this.isEmailVerified = false;
        }
    }

    public void deactivate() {
        this.isActive = false;
    }

    // ──────────────── Category Operations ────────────────
    public Category createCategory(String name) {
        ensureActive();
        if (name == null || name.trim().isEmpty())
            throw new IllegalArgumentException("Category name cannot be null or empty");

        Category category = Category.create(name.trim(), this);
        this.categories.add(category);
        return category;
    }

    public Category deleteCategory(Category category) {
        ensureActive();
        if (category == null)
            throw new IllegalArgumentException("Category cannot be null");

        return category.delete();
    }

    public void changeCategoryName(String newName, Category category) {
        ensureActive();
        if (category == null)
            throw new IllegalArgumentException("Category cannot be null");

        category.updateName(newName);
    }

    // ──────────────── Activity Operations ────────────────
    public Activity createActivity(String title, String description, Category category) {
        ensureActive();
        Activity activity = Activity.create(title, description, this, category);
        this.activities.add(activity);
        return activity;
    }

    public Activity updateActivity(Activity activityToUpdate, String newTitle, String newDescription, Category newCategory) {
        ensureActive();
        if (activityToUpdate == null)
            throw new IllegalArgumentException("Activity cannot be null");

        activityToUpdate.updateDetails(newTitle, newDescription, newCategory);
        return activityToUpdate;
    }

    public Activity deleteActivity(Activity activity) {
        ensureActive();
        if (activity == null)
            throw new IllegalArgumentException("Activity cannot be null");

        return activity.delete(activity.getId());
    }

    // ──────────────── Pomodoro Session Operations ────────────────
/*    public PomodoroSession createPomodoroSession(Activity activity, String title, int workDurationInMinutes, int breakDurationInMinutes, int totalCycles) {
        ensureActive();
        return activity.createPomodoroSession(title, workDurationInMinutes, breakDurationInMinutes);
    }*/

    // ──────────────── Guards ────────────────
    private void ensureActive() {
        if (!this.isActive)
            throw new IllegalStateException("Inactive user cannot perform operations");
    }

    // ──────────────── Streak Logic ────────────────
    public int getCurrentStreak(Set<LocalDate> focusDays, LocalDate today, ZoneId zoneId) {
        ensureActive();
        if (focusDays == null || focusDays.isEmpty()) return 0;
        int streak = 0;
        LocalDate cursor = today;
        while (focusDays.contains(cursor)) {
            streak++;
            cursor = cursor.minusDays(1);
        }
        return streak;
    }

    public int getBestStreak(Set<LocalDate> focusDays) {
        ensureActive();
        if (focusDays == null || focusDays.isEmpty()) return 0;
        // Use ordered traversal to count consecutive days
        TreeSet<LocalDate> ordered = new TreeSet<>(focusDays);
        int best = 0;
        int current = 0;
        LocalDate prev = null;
        for (LocalDate d : ordered) {
            if (prev == null || d.equals(prev.plusDays(1))) {
                current++;
            } else {
                best = Math.max(best, current);
                current = 1;
            }
            prev = d;
        }
        best = Math.max(best, current);
        return best;
    }


}
