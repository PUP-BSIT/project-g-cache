package com.pomodify.backend.domain.factory;

import com.pomodify.backend.domain.model.Activity;
import com.pomodify.backend.domain.model.PomodoroSession;

/**
 * Factory for creating PomodoroSession entities within the Activity aggregate.
 * Encapsulates the logic of creating valid PomodoroSession entities and maintaining
 * bidirectional relationships.
 */
public class PomodoroSessionFactory {

    /**
     * Create a new Pomodoro session with custom work and break durations.
     * Maintains bidirectional relationship between Activity and PomodoroSession.
     *
     * @param activity The activity this session belongs to
     * @param workDurationMinutes Work duration in minutes (e.g., 25 for standard Pomodoro)
     * @param breakDurationMinutes Break duration in minutes (e.g., 5 for short break)
     * @return The newly created PomodoroSession
     */
    public PomodoroSession createSession(Activity activity, Integer workDurationMinutes, Integer breakDurationMinutes) {
        if (activity == null) {
            throw new IllegalArgumentException("Activity cannot be null");
        }
        if (workDurationMinutes == null || workDurationMinutes <= 0) {
            throw new IllegalArgumentException("Work duration must be positive");
        }
        if (breakDurationMinutes == null || breakDurationMinutes <= 0) {
            throw new IllegalArgumentException("Break duration must be positive");
        }

        PomodoroSession session = PomodoroSession.builder()
                .workDurationMinutes(workDurationMinutes)
                .breakDurationMinutes(breakDurationMinutes)
                .isCompleted(false)
                .cyclesCompleted(0)
                .isDeleted(false)
                .build();

        // Maintain bidirectional relationship through aggregate
        activity.addSession(session);

        return session;
    }

    /**
     * Create a standard Pomodoro session (25 minutes work, 5 minutes break).
     *
     * @param activity The activity this session belongs to
     * @return The newly created PomodoroSession with standard durations
     */
    public PomodoroSession createStandardSession(Activity activity) {
        return createSession(activity, 25, 5);
    }

    /**
     * Create a long Pomodoro session (50 minutes work, 10 minutes break).
     *
     * @param activity The activity this session belongs to
     * @return The newly created PomodoroSession with long durations
     */
    public PomodoroSession createLongSession(Activity activity) {
        return createSession(activity, 50, 10);
    }

    /**
     * Create a short Pomodoro session (15 minutes work, 3 minutes break).
     *
     * @param activity The activity this session belongs to
     * @return The newly created PomodoroSession with short durations
     */
    public PomodoroSession createShortSession(Activity activity) {
        return createSession(activity, 15, 3);
    }

    /**
     * Create and immediately start a Pomodoro session.
     *
     * @param activity The activity this session belongs to
     * @param workDurationMinutes Work duration in minutes
     * @param breakDurationMinutes Break duration in minutes
     * @return The newly created and started PomodoroSession
     */
    public PomodoroSession createAndStartSession(Activity activity, Integer workDurationMinutes, Integer breakDurationMinutes) {
        PomodoroSession session = createSession(activity, workDurationMinutes, breakDurationMinutes);
        session.start();
        return session;
    }
}
