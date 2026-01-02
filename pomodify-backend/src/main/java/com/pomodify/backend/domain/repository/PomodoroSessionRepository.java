package com.pomodify.backend.domain.repository;

import com.pomodify.backend.domain.model.PomodoroSession;
import java.time.LocalDateTime;

import java.util.List;
import java.util.Optional;

/**
 * Domain repository interface for managing PomodoroSession aggregates.
 * Defines the contract for persistence operations related to Pomodoro sessions.
 * Implementations should ensure aggregate consistency and proper handling of the session state.
 */
public interface PomodoroSessionRepository {

    /**
     * Find a PomodoroSession by its unique ID.
     *
     * @param id The ID of the session.
     * @return Optional containing the session if found, empty otherwise.
     */
    Optional<PomodoroSession> findById(Long id);

    /**
     * Find all PomodoroSessions for a specific user.
     *
     * @param userId The ID of the user.
     * @return List of sessions for the user, including inactive sessions.
     */
    List<PomodoroSession> findByUserId(Long userId);

    /**
     * Find all active (non-deleted) PomodoroSessions for a specific user.
     *
     * @param userId The ID of the user.
     * @return List of active sessions for the user.
     */
    List<PomodoroSession> findActiveByUserId(Long userId);

    /**
     * Find all PomodoroSessions associated with a specific activity.
     *
     * @param activityId The ID of the activity.
     * @return List of sessions associated with the activity.
     */
    List<PomodoroSession> findByActivityId(Long activityId);

    /**
     * Find all PomodoroSessions for a specific activity and user.
     * This method validates that the activity belongs to the user.
     *
     * @param activityId The ID of the activity.
     * @param userId The ID of the user.
     * @return List of sessions for the activity owned by the user.
     */
    List<PomodoroSession> findByActivityIdAndUserId(Long activityId, Long userId);

    /**
     * Save a PomodoroSession (create or update).
     * Should persist the entire session aggregate, including its state.
     *
     * @param session The PomodoroSession entity to save.
     * @return The saved PomodoroSession entity.
     */
    PomodoroSession save(PomodoroSession session);

    /**
     * Soft delete a PomodoroSession by marking it inactive.
     *
     * @param session The session entity to delete.
     */
    void delete(PomodoroSession session);

    /**
     * Check if a PomodoroSession exists for a specific user.
     * Useful for authorization and validation checks.
     *
     * @param id The session ID.
     * @param userId The user ID.
     * @return true if exists, false otherwise.
     */
    boolean existsByIdAndUserId(Long id, Long userId);

    /**
     * Find a PomodoroSession by its ID and the owning user's ID.
     * Ensures the session belongs to the given user.
     *
     * @param id The session ID.
     * @param userId The user ID.
     * @return Optional containing the session if found, empty otherwise.
     */
    Optional<PomodoroSession> findByIdAndUserId(Long id, Long userId);

    /** Completed sessions for user between completedAt range (inclusive) */
    List<PomodoroSession> findCompletedByUserIdBetween(Long userId, LocalDateTime start, LocalDateTime end);

    /** All completed sessions for user */
    List<PomodoroSession> findCompletedByUserId(Long userId);

    /** Last 5 completed sessions ordered by completedAt desc */
    List<PomodoroSession> findRecentCompletedByUserId(Long userId, int limit);

    /**
     * Fetches the most recent session notes for a given activity, limited by count.
     *
     * @param activityId The activity ID.
     * @param limit The maximum number of notes to fetch.
     * @return List of notes (most recent first).
     */
    List<String> findRecentNotesByActivityId(Long activityId, int limit);

    /**
     * Find all IN_PROGRESS sessions where phase_end_time has passed and notification not yet sent.
     * Used by scheduled job for backend-triggered push notifications.
     *
     * @param now Current timestamp to compare against phase_end_time.
     * @return List of sessions needing notification.
     */
    List<PomodoroSession> findSessionsNeedingNotification(LocalDateTime now);
}
