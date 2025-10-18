package com.pomodify.backend.application.services;

import com.pomodify.backend.application.dto.request.RegisterRequest;
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
     * @param request RegisterRequest DTO containing username, email, and password
     * @return UserResponse DTO with user data
     * @throws IllegalArgumentException if username or email already exists, or validation fails
     */
    @Transactional
    public UserResponse registerUser(RegisterRequest request) {
        log.info("Attempting to register new user: {}", request.username());

        // Validate input using dedicated validator
        registrationValidator.validateRegistration(request.username(), request.email(), request.password());

        // Check for duplicate username
        if (userRepository.existsByUsername(request.username())) {
            log.warn("Registration failed: Username '{}' already exists", request.username());
            throw new IllegalArgumentException("Username already exists");
        }

        // Check for duplicate email
        Email emailVO = new Email(request.email());
        if (userRepository.existsByEmail(emailVO)) {
            log.warn("Registration failed: Email '{}' already exists", request.email());
            throw new IllegalArgumentException("Email already exists");
        }

        String passwordHash = passwordEncoder.encode(request.password());
        User user = userFactory.createUser(request.username(), request.email(), passwordHash);
        User savedUser = userRepository.save(user);

        log.info("Successfully registered new user with ID: {}", savedUser.getId());

        return userMapper.toUserResponse(savedUser);
    }
}