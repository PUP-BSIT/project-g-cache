package com.pomodify.backend.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "category")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User user;

    @OneToMany(mappedBy = "category", cascade = CascadeType.ALL, orphanRemoval = false)
    @Builder.Default
    private List<Activity> activities = new ArrayList<>();

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    // ──────────────────────────────
    // Factory Method
    // ──────────────────────────────

    public static Category create(String name, User user) {
        if (name == null || name.trim().isEmpty())
            throw new IllegalArgumentException("Category name cannot be null or empty");
        if (user == null)
            throw new IllegalArgumentException("User cannot be null");

        return Category.builder()
                .name(name.trim())
                .user(user)
                .isActive(true)
                .build();
    }

    // ──────────────────────────────
    // Domain Logic
    // ──────────────────────────────

    public void updateName(String newName) {
        if (newName == null || newName.trim().isEmpty())
            throw new IllegalArgumentException("Category name cannot be null or empty");
        this.name = newName.trim();
    }

    public Activity createActivity(String title, String description) {
        Activity activity = Activity.create(title, description, this.user, this);
        addActivity(activity);
        return activity;
    }

    public void addActivity(Activity activity) {
        if (activity == null)
            throw new IllegalArgumentException("Activity cannot be null");
        if (!activities.contains(activity)) {
            activities.add(activity);
            activity.setCategory(this);
        }
    }

    public void removeActivity(Activity activity) {
        if (activity == null)
            throw new IllegalArgumentException("Activity cannot be null");
        if (activities.contains(activity)) {
            activities.remove(activity);
            activity.setCategory(null);
            activity.setActive(false);
        }
    }

    public List<Activity> getActiveActivities() {
        return activities.stream()
                .filter(Activity::isActive)
                .toList();
    }

    public List<Activity> getInactiveActivities() {
        return activities.stream()
                .filter(a -> !a.isActive())
                .toList();
    }

    public void deactivate() {
        this.isActive = false;
        activities.forEach(a -> a.setActive(false));
    }
}
