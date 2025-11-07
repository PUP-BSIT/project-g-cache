package com.pomodify.backend.infrastructure.factory;

import com.pomodify.backend.domain.model.Activity;
import com.pomodify.backend.domain.model.User;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Spring-managed wrapper for ActivityFactory.
 * Allows dependency injection while keeping domain factory framework-agnostic.
 */
@Component
public class ActivityFactoryBean {
    
    private final ActivityFactory activityFactory;
    
    public ActivityFactoryBean() {
        this.activityFactory = new ActivityFactory();
    }
    
    /**
     * Create a new Activity and add it to the user's activity list.
     * Delegates to domain factory.
     */
    public Activity createActivity(String title, String description, User owner) {
        return activityFactory.createActivity(title, description, owner);
    }
    
    /**
     * Create a scheduled Activity with a specific date/time.
     * Delegates to domain factory.
     */
    public Activity createScheduledActivity(String title, String description, 
                                           LocalDateTime scheduledAt, User owner) {
        return activityFactory.createScheduledActivity(title, description, scheduledAt, owner);
    }
    
    /**
     * Create an Activity with estimated duration.
     * Delegates to domain factory.
     */
    public Activity createActivityWithDuration(String title, String description, 
                                               Integer estimatedDurationMinutes, User owner) {
        return activityFactory.createActivityWithDuration(title, description, estimatedDurationMinutes, owner);
    }
}

