package com.pomodify.backend.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "categories")
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @OneToMany(mappedBy = "category", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Activity> activities = new ArrayList<>();

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private boolean isDeleted = false;

    // Domain methods
    public void addActivity(Activity activity) {
        if (!activity.getUser().getId().equals(this.user.getId())) {
            throw new IllegalArgumentException("Activity user does not match category user");
        }
        activities.add(activity);
        activity.setCategory(this);
    }

    public void removeActivity(Activity activity) {
        activities.remove(activity);
        activity.setCategory(null);
    }

    public List<Activity> getActiveActivities() {
        return activities.stream()
                .filter(activity -> !activity.isDeleted())
                .toList();
    }

    public boolean belongsToUser(Long userId) {
        return this.user.getId().equals(userId);
    }

    public void delete() {
        this.isDeleted = true;
        activities.forEach(Activity::delete);
    }

    public static Category create(String name, User user) {
        Category category = new Category();
        category.setName(name);
        category.setUser(user);
        return category;
    }
}