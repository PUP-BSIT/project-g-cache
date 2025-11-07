package com.pomodify.backend.domain.factory;

import com.pomodify.backend.domain.model.User;
import com.pomodify.backend.domain.valueobject.Email;

/**
 * Factory responsible for creating {@link User} aggregate roots.
 * Encapsulates the business rules required for valid user creation.
 */
public class UserFactory {

    /**
     * Creates a new User with the given credentials.
     * The user starts as active, with an unverified email.
     *
     * @param username the chosen username
     * @param emailValue the email string to be wrapped as a value object
     * @param passwordHash the already-hashed password
     * @return a new User aggregate instance
     */
    public User createUser(String username, String emailValue, String passwordHash) {
        if (username == null || username.isBlank()) {
            throw new IllegalArgumentException("Username cannot be null or blank");
        }
        if (emailValue == null || emailValue.isBlank()) {
            throw new IllegalArgumentException("Email cannot be null or blank");
        }
        if (passwordHash == null || passwordHash.isBlank()) {
            throw new IllegalArgumentException("Password hash cannot be null or blank");
        }

        Email email = new Email(emailValue.trim());

        return User.builder()
                .username(username.trim())
                .email(email)
                .passwordHash(passwordHash)
                .isEmailVerified(false)
                .isActive(true)
                .build();
    }
}
