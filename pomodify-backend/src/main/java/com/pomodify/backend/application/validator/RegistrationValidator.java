package com.pomodify.backend.application.validator;

import org.springframework.stereotype.Component;

/**
 * Validator for user registration input.
 * Application layer validation - validates input before it reaches domain logic.
 */
@Component
public class RegistrationValidator {
    
    private static final int MIN_USERNAME_LENGTH = 3;
    private static final int MAX_USERNAME_LENGTH = 50;
    private static final int MIN_PASSWORD_LENGTH = 8;
    private static final int MAX_PASSWORD_LENGTH = 100;
    private static final String USERNAME_PATTERN = "^[a-zA-Z0-9_-]+$";
    
    /**
     * Validate complete registration input (username, email, password).
     * 
     * @param username Username to validate
     * @param email Email to validate
     * @param password Password to validate
     * @throws IllegalArgumentException if any validation fails
     */
    public void validateRegistration(String username, String email, String password) {
        validateUsername(username);
        validateEmail(email);
        validatePassword(password);
    }
    
    /**
     * Validate username format and constraints.
     * 
     * @param username Username to validate
     * @throws IllegalArgumentException if validation fails
     */
    public void validateUsername(String username) {
        if (username == null || username.trim().isEmpty()) {
            throw new IllegalArgumentException("Username cannot be null or empty");
        }
        
        if (username.length() < MIN_USERNAME_LENGTH) {
            throw new IllegalArgumentException(
                String.format("Username must be at least %d characters long", MIN_USERNAME_LENGTH)
            );
        }
        
        if (username.length() > MAX_USERNAME_LENGTH) {
            throw new IllegalArgumentException(
                String.format("Username cannot exceed %d characters", MAX_USERNAME_LENGTH)
            );
        }
        
        if (!username.matches(USERNAME_PATTERN)) {
            throw new IllegalArgumentException(
                "Username can only contain letters, numbers, underscores, and hyphens"
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
    
    /**
     * Validate password strength with additional complexity requirements.
     * Optional method for stricter password policies.
     * 
     * @param password Password to validate
     * @throws IllegalArgumentException if validation fails
     */
    public void validatePasswordStrength(String password) {
        validatePassword(password);
        
        boolean hasUpperCase = password.chars().anyMatch(Character::isUpperCase);
        boolean hasLowerCase = password.chars().anyMatch(Character::isLowerCase);
        boolean hasDigit = password.chars().anyMatch(Character::isDigit);
        
        if (!hasUpperCase || !hasLowerCase || !hasDigit) {
            throw new IllegalArgumentException(
                "Password must contain at least one uppercase letter, one lowercase letter, and one digit"
            );
        }
    }
}

