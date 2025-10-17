package com.pomodify.backend.domain.factory;

import com.pomodify.backend.domain.model.User;
import com.pomodify.backend.domain.valueobject.Email;

/**
 * Factory for creating User aggregate roots.
 * Encapsulates the complex logic of creating valid User entities.
 */
public class UserFactory {

    /**
     * Create a new User with the given credentials.
     * The user starts with unverified email and is not deleted.
     */
    public User createUser(String username, String emailValue, String passwordHash) {
        if (username == null || username.trim().isEmpty()) {
            throw new IllegalArgumentException("Username cannot be null or empty");
        }
        if (passwordHash == null || passwordHash.trim().isEmpty()) {
            throw new IllegalArgumentException("Password hash cannot be null or empty");
        }

        Email email = new Email(emailValue);

        return User.builder()
                .username(username.trim())
                .email(email)
                .passwordHash(passwordHash)
                .isEmailVerified(false)
                .isDeleted(false)
                .build();
    }
}
