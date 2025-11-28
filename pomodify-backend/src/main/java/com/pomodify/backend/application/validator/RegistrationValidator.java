package com.pomodify.backend.application.validator;

import org.springframework.stereotype.Component;

/**
 * Validator for user registration input.
 * Application layer validation - validates input before it reaches domain logic.
 */
@Component
public class RegistrationValidator {
    private static final int MIN_PASSWORD_LENGTH = 8;
    private static final int MAX_PASSWORD_LENGTH = 100;
    private static final int MAX_NAME_LENGTH = 50;
    private static final String NAME_PATTERN = "^[A-Za-z\\s-]+$";
    
    /**
     * Validate complete registration input (username, email, password).
     * 
     * @param firstName First Name to validate
     * @param lastName Last Name to validate
     * @param email Email to validate
     * @param password Password to validate
     * @throws IllegalArgumentException if any validation fails
     */
    public void validateRegistration(String firstName, String lastName, String email, String password) {
        validateName(firstName);
        validateName(lastName);
        validateEmail(email);
        validatePassword(password);
    }
    
    /**
     * Validate username format and constraints.
     * 
     * @param name First Name or Last Name to validate
     * @throws IllegalArgumentException if validation fails
     */

    public void validateName(String name) {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("First name or last name cannot be null or empty");
        }

        if (name.length() > MAX_NAME_LENGTH) {
            throw new IllegalArgumentException(
                    String.format("First name or last name cannot exceed %d characters", MAX_NAME_LENGTH)
            );
        }

        if (!name.matches(NAME_PATTERN)) {
            throw new IllegalArgumentException(
                    "First name or last name can only contain letters, spaces, and hyphens"
            );
        }
    }

    
    /**
     * Validate email is not null or empty.
     * Detailed email format validation is handled by Email value object.
     * 
     * @param email Email to validate
     * @throws IllegalArgumentException if validation fails
     */
    public void validateEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException("Email cannot be null or empty");
        }
    }
    
    /**
     * Validate password strength and constraints.
     * 
     * @param password Password to validate
     * @throws IllegalArgumentException if validation fails
     */
    public void validatePassword(String password) {
        if (password == null || password.isEmpty()) {
            throw new IllegalArgumentException("Password cannot be null or empty");
        }
        
        if (password.length() < MIN_PASSWORD_LENGTH) {
            throw new IllegalArgumentException(
                String.format("Password must be at least %d characters long", MIN_PASSWORD_LENGTH)
            );
        }
        
        if (password.length() > MAX_PASSWORD_LENGTH) {
            throw new IllegalArgumentException(
                String.format("Password cannot exceed %d characters", MAX_PASSWORD_LENGTH)
            );
        }
    }
}

