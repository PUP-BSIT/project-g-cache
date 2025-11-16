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
     * @param firstName the user's first name
     * @param lastName the user's last name
     * @param email the email string to be wrapped as a value object
     * @param passwordHash the already-hashed password
     * @return a new User aggregate instance
     */
    public User createUser(String firstName, String lastName, Email email, String passwordHash) {
        if (firstName == null || firstName.isBlank()) {
            throw new IllegalArgumentException("First name cannot be null or blank");
        }
        if (lastName == null || lastName.isBlank()) {
            throw new IllegalArgumentException("Last name cannot be null or blank");
        }
        if (email == null) {
            throw new IllegalArgumentException("Email cannot be null or blank");
        }
        if (passwordHash == null || passwordHash.isBlank()) {
            throw new IllegalArgumentException("Password hash cannot be null or blank");
        }

        return User.builder()
                .firstName(firstName.trim())
                .lastName(lastName.trim())
                .email(email)
                .passwordHash(passwordHash)
                .isEmailVerified(false)
                .isActive(true)
                .build();
    }
}
