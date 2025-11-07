package com.pomodify.backend.infrastructure.factory;

import com.pomodify.backend.domain.model.Activity;
import com.pomodify.backend.domain.model.PomodoroSession;
import org.springframework.stereotype.Component;

/**
 * Spring-managed wrapper for PomodoroSessionFactory.
 * Allows dependency injection while keeping domain factory framework-agnostic.
 */
@Component
public class PomodoroSessionFactoryBean {
    
    private final PomodoroSessionFactory pomodoroSessionFactory;
    
    public PomodoroSessionFactoryBean() {
        this.pomodoroSessionFactory = new PomodoroSessionFactory();
    }
    
    /**
     * Create a new Pomodoro session with custom work and break durations.
     * Delegates to domain factory.
     */
    public PomodoroSession createSession(Activity activity, Integer workDurationMinutes, Integer breakDurationMinutes) {
        return pomodoroSessionFactory.createSession(activity, workDurationMinutes, breakDurationMinutes);
    }
    
    /**
     * Create a standard Pomodoro session (25 minutes work, 5 minutes break).
     * Delegates to domain factory.
     */
    public PomodoroSession createStandardSession(Activity activity) {
        return pomodoroSessionFactory.createStandardSession(activity);
    }
    
    /**
     * Create a long Pomodoro session (50 minutes work, 10 minutes break).
     * Delegates to domain factory.
     */
    public PomodoroSession createLongSession(Activity activity) {
        return pomodoroSessionFactory.createLongSession(activity);
    }
    
    /**
     * Create a short Pomodoro session (15 minutes work, 3 minutes break).
     * Delegates to domain factory.
     */
    public PomodoroSession createShortSession(Activity activity) {
        return pomodoroSessionFactory.createShortSession(activity);
    }
    
    /**
     * Create and immediately start a Pomodoro session.
     * Delegates to domain factory.
     */
    public PomodoroSession createAndStartSession(Activity activity, Integer workDurationMinutes, Integer breakDurationMinutes) {
        return pomodoroSessionFactory.createAndStartSession(activity, workDurationMinutes, breakDurationMinutes);
    }
}
