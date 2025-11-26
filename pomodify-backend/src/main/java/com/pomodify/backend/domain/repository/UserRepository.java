package com.pomodify.backend.domain.repository;

import com.pomodify.backend.domain.model.User;
import com.pomodify.backend.domain.valueobject.Email;

import java.util.List;
import java.util.Optional;

/**
 * Repository interface for User aggregate root.
 * Handles persistence operations for the entire User aggregate.
 */
public interface UserRepository {

    /**
     * Save a user (create or update).
     * Persists the entire aggregate including categories and activities.
     */
    User save(User user);

    /**
     * Find a user by their unique ID.
     */
    Optional<User> findUser(Long id);

    /**
     * Find a user by their unique email.
     */
    Optional<User> findByEmail(Email email);

    /**
     * Check if an email already exists.
     */
    boolean existsByEmail(Email email);

    /**
     * Soft delete a user.
     * Typically, you would call user.deactivate() then save(user).
     */
    void delete(User user);

    /**
     * Get all active (non-deleted) users.
     */
    List<User> findAllActive();
}
