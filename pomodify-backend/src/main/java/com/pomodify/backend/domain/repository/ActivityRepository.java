package com.pomodify.backend.domain.repository;

import com.pomodify.backend.domain.model.Activity;

import java.util.List;
import java.util.Optional;

/**
 * Domain repository interface for managing Activity aggregates.
 * Defines the contract for persistence operations related to Activities.
 * Implementations should ensure aggregate consistency.
 */
public interface ActivityRepository {

    /**
     * Find an Activity by its unique ID.
     *
     * @param id The ID of the activity.
     * @return Optional containing the Activity if found, empty otherwise.
     */
    Optional<Activity> findById(Long id);

    /**
     * Find all Activities owned by a specific user.
     *
     * @param userId The ID of the user.
     * @return List of Activities for the user, including inactive ones.
     */
    List<Activity> findByUserId(Long userId);

    /**
     * Find all active (non-deleted) Activities owned by a specific user.
     *
     * @param userId The ID of the user.
     * @return List of active Activities for the user.
     */
    List<Activity> findActiveByUserId(Long userId);

    /**
     * Find all Activities under a specific category.
     *
     * @param categoryId The ID of the category.
     * @return List of Activities associated with the category.
     */
    List<Activity> findByCategoryId(Long categoryId);

    /**
     * Save an Activity (create or update).
     * Should persist the entire Activity aggregate.
     *
     * @param activity The Activity entity to save.
     * @return The saved Activity entity.
     */
    Activity save(Activity activity);

    /**
     * Soft delete an Activity by marking it inactive.
     *
     * @param activity The Activity entity to delete.
     */
    void delete(Activity activity);

    /**
     * Check if an Activity exists for a specific user.
     * Useful for authorization checks.
     *
     * @param id The Activity ID.
     * @param userId The User ID.
     * @return true if exists, false otherwise.
     */
    boolean existsByIdAndUserId(Long id, Long userId);

    /**
     * Find an Activity by ID and User ID.
     * Useful for ensuring the activity belongs to the user.
     *
     * @param id The Activity ID.
     * @param userId The User ID.
     * @return Optional containing the Activity if found, empty otherwise.
     */
    Optional<Activity> findByIdAndUserId(Long id, Long userId);
}
