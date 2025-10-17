package com.pomodify.backend.domain.repository;

import com.pomodify.backend.domain.model.User;
import com.pomodify.backend.domain.valueobject.Email;

import java.util.Optional;

/**
 * Domain repository interface for User aggregate root.
 * This is the domain's contract for persistence operations.
 * Implementation will be provided in the infrastructure layer.
 */
public interface UserRepository {
    
    /**
     * Save a user (create or update).
     * This persists the entire aggregate including activities and sessions.
     */
    User save(User user);
    
    /**
     * Find a user by their unique ID.
     */
    Optional<User> findById(Long id);
    
    /**
     * Find a user by their unique username.
     */
    Optional<User> findByUsername(String username);
    
    /**
     * Find a user by their unique email.
     */
    Optional<User> findByEmail(Email email);
    
    /**
     * Check if a username already exists.
     */
    boolean existsByUsername(String username);
    
    /**
     * Check if an email already exists.
     */
    boolean existsByEmail(Email email);
    
    /**
     * Soft delete a user.
     * Note: In practice, you'd typically call user.delete() then save(user).
     * This method is provided for convenience.
     */
    void delete(User user);
    
    /**
     * Find all active (non-deleted) users.
     * Use with caution - may return large datasets.
     */
    Iterable<User> findAllActive();
}

