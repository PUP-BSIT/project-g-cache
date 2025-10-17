package com.pomodify.backend.application.services;

import com.pomodify.backend.application.dto.response.AuthResponse;
import com.pomodify.backend.application.dto.response.RegisterResponse;
import com.pomodify.backend.application.dto.response.UserResponse;
import com.pomodify.backend.application.mapper.UserMapper;
import com.pomodify.backend.application.validator.RegistrationValidator;
import com.pomodify.backend.infrastructure.factory.UserFactoryBean;
import com.pomodify.backend.domain.model.User;
import com.pomodify.backend.domain.repository.UserRepository;
import com.pomodify.backend.domain.valueobject.Email;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private RegistrationValidator registrationValidator;

    @Autowired
    private UserFactoryBean userFactory;

    @Autowired
    private UserMapper userMapper;

    /**
     * Register a new user.
     * Application service handles password encoding (framework concern),
     * validation, duplicate checking, then delegates to domain factory for user creation (domain logic).
     *
     * @param username Desired username
     * @param email User's email address
     * @param rawPassword Plain text password (will be hashed)
     * @return RegisterResponse DTO with success message and user data
     * @throws IllegalArgumentException if username or email already exists, or validation fails
     */
    @Transactional
    public RegisterResponse registerUser(String username, String email, String rawPassword) {
        log.info("Attempting to register new user: {}", username);

        // Validate input using dedicated validator
        registrationValidator.validateRegistration(username, email, rawPassword);

        // Check for duplicate username
        if (userRepository.existsByUsername(username)) {
            log.warn("Registration failed: Username '{}' already exists", username);
            throw new IllegalArgumentException("Username already exists");
        }

        // Check for duplicate email
        Email emailVO = new Email(email);
        if (userRepository.existsByEmail(emailVO)) {
            log.warn("Registration failed: Email '{}' already exists", email);
            throw new IllegalArgumentException("Email already exists");
        }

        String passwordHash = passwordEncoder.encode(rawPassword);
        User user = userFactory.createUser(username, email, passwordHash);
        User savedUser = userRepository.save(user);

        log.info("Successfully registered new user with ID: {}", savedUser.getId());

        // Convert domain entity to DTO before returning
        UserResponse userResponse = userMapper.toUserResponse(savedUser);
        return new RegisterResponse("User registered successfully", userResponse);
    }

    /**
     * Authenticate user with username and password.
     *
     * @param username Username
     * @param rawPassword Plain text password
     * @return AuthResponse DTO with user data (token will be added later)
     * @throws IllegalArgumentException if credentials are invalid
     * @throws IllegalStateException if account is deleted
     */
    public AuthResponse authenticate(String username, String rawPassword) {
        log.info("Authenticating user: {}", username);

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Invalid username or password"));

        if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid username or password");
        }

        if (user.isDeleted()) {
            throw new IllegalStateException("User account has been deleted");
        }

        log.info("User authenticated successfully: {}", username);

        // Convert domain entity to DTO before returning
        UserResponse userResponse = userMapper.toUserResponse(user);
        return new AuthResponse("Authentication successful", userResponse, null);  // Token will be added later
    }
}