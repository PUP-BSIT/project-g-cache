package com.pomodify.backend.domain.model;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class Category {
    private final UUID id;
    private String name;
    private final UUID userId;
    private final List<Activity> activities;

    public Category(UUID id, String name, UUID userId) {
        this.id = id;
        this.name = name;
        this.userId = userId;
        this.activities = new ArrayList<>();
    }

    public static Category create(String name, UUID userId) {
        return new Category(UUID.randomUUID(), name, userId);
    }

    public void addActivity(Activity activity) {
        if (!activity.getUserId().equals(this.userId)) {
            throw new IllegalArgumentException("Activity user does not match category user");
        }
        if (!activity.getCategoryId().equals(this.id)) {
            throw new IllegalArgumentException("Activity category does not match this category");
        }
        activities.add(activity);
    }

    public void removeActivity(UUID activityId) {
        activities.removeIf(activity -> activity.getId().equals(activityId));
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public UUID getUserId() {
        return userId;
    }

    public List<Activity> getActivities() {
        return new ArrayList<>(activities);
    }
}