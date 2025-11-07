package com.pomodify.backend.infrastructure.repository.spring;

import com.pomodify.backend.domain.model.User;
import com.pomodify.backend.domain.valueobject.Email;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository interface for User entity.
 * Provides framework-specific JPA operations.
 * Not to be confused with the domain UserRepository interface.
 */
@Repository
public interface SpringUserJpaRepository extends JpaRepository<User, Long> {

    /**
     * Find user by username.
     */
    Optional<User> findByUsername(String username);

    /**
     * Find user by email value object.
     */
    Optional<User> findByEmail(Email email);

    /**
     * Check if username exists.
     */
    boolean existsByUsername(String username);

    /**
     * Check if email exists.
     */
    boolean existsByEmail(Email email);

    /**
     * Find all active (non-deleted) users.
     */
    @Query("SELECT u FROM User u WHERE u.isActive = true")
    List<User> findAllActive();
}
