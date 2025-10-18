package com.pomodify.backend.domain.factory;

import com.pomodify.backend.domain.model.Activity;
import com.pomodify.backend.domain.model.User;

import java.time.LocalDateTime;

/**
 * Factory for creating Activity entities within the User aggregate.
 * Encapsulates the logic of creating valid Activity entities and maintaining
 * bidirectional relationships.
 */
public class ActivityFactory {
    
    /**
     * Create a new Activity and add it to the user's activity list.
     * Maintains bidirectional relationship between User and Activity.
     * 
     * @param title Activity title (required)
     * @param description Activity description (optional)
     * @param owner The user who owns this activity
     * @return The newly created Activity
     */
    public Activity createActivity(String title, String description, User owner) {
        if (title == null || title.trim().isEmpty()) {
            throw new IllegalArgumentException("Activity title cannot be null or empty");
        }
        if (owner == null) {
            throw new IllegalArgumentException("Owner cannot be null");
        }
        
        Activity activity = Activity.builder()
                .title(title.trim())
                .description(description)
                .isDeleted(false)
                .build();
        
        // Maintain bidirectional relationship through aggregate root
        owner.addActivity(activity);
        
        return activity;
    }
    
    /**
     * Create a scheduled Activity with a specific date/time.
     * 
     * @param title Activity title (required)
     * @param description Activity description (optional)
     * @param scheduledAt When the activity is scheduled for
     * @param owner The user who owns this activity
     * @return The newly created Activity
     */
    public Activity createScheduledActivity(String title, String description, 
                                           LocalDateTime scheduledAt, User owner) {
        Activity activity = createActivity(title, description, owner);
        activity.scheduleFor(scheduledAt);
        return activity;
    }
    
    /**
     * Create an Activity with estimated duration.
     * 
     * @param title Activity title (required)
     * @param description Activity description (optional)
     * @param estimatedDurationMinutes Estimated total duration in minutes
     * @param owner The user who owns this activity
     * @return The newly created Activity
     */
    public Activity createActivityWithDuration(String title, String description, 
                                               Integer estimatedDurationMinutes, User owner) {
        Activity activity = createActivity(title, description, owner);
        if (estimatedDurationMinutes != null && estimatedDurationMinutes > 0) {
            activity.setEstimatedDuration(estimatedDurationMinutes);
        }
        return activity;
    }
}
