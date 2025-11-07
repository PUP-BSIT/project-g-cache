package com.pomodify.backend.application.services;

import com.pomodify.backend.application.dto.request.LoginRequest;
import com.pomodify.backend.application.dto.request.RegisterRequest;
import com.pomodify.backend.application.dto.response.AuthResponse;
import com.pomodify.backend.application.dto.response.UserResponse;
import com.pomodify.backend.application.mapper.UserMapper;
import com.pomodify.backend.application.validator.RegistrationValidator;
import com.pomodify.backend.infrastructure.factory.UserFactoryBean;
import com.pomodify.backend.domain.model.User;
import com.pomodify.backend.domain.repository.UserRepository;
import com.pomodify.backend.domain.valueobject.Email;
import com.pomodify.backend.domain.model.RevokedToken;
import com.pomodify.backend.domain.repository.RevokedTokenRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;

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
    private JwtService jwtService;

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private RevokedTokenRepository revokedTokenRepository;

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
        log.info("Attempting to register new user: {}", request.getUsername());

        // Validate input using dedicated validator
        registrationValidator.validateRegistration(request.getUsername(), request.getEmail(), request.getPassword());

        // Check for duplicate username
        if (userRepository.existsByUsername(request.getUsername())) {
            log.warn("Registration failed: Username '{}' already exists", request.getUsername());
            throw new IllegalArgumentException("Username already exists");
        }

        // Check for duplicate email
        Email emailVO = new Email(request.getEmail());
        if (userRepository.existsByEmail(emailVO)) {
            log.warn("Registration failed: Email '{}' already exists", request.getEmail());
            throw new IllegalArgumentException("Email already exists");
        }

        String passwordHash = passwordEncoder.encode(request.getPassword());
        User user = userFactory.createUser(request.getUsername(), request.getEmail(), passwordHash);
        User savedUser = userRepository.save(user);

        log.info("Successfully registered new user with ID: {}", savedUser.getId());

        return userMapper.toUserResponse(savedUser);
    }

    /**
     * Authenticate a user and generate JWT tokens.
     *
     * @param request LoginRequest DTO containing username/email and password
     * @return AuthResponse DTO with user data and tokens
     * @throws IllegalArgumentException if credentials are invalid
     */
    @Transactional(readOnly = true)
    public AuthResponse loginUser(LoginRequest request) {
        log.info("Attempting to login user: {}", request.getUsername());

        User user = userRepository.findByUsername(request.getUsername())
                .orElseGet(() -> userRepository.findByEmail(new Email(request.getUsername())).orElse(null));

        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            log.warn("Login failed: Invalid credentials for {}", request.getUsername());
            throw new IllegalArgumentException("Invalid credentials");
        }

        String accessToken = jwtService.generateAccessToken(user.getUsername());
        String refreshToken = jwtService.generateRefreshToken(user.getUsername());
        UserResponse userResponse = userMapper.toUserResponse(user);

        log.info("Successfully logged in user: {}", user.getUsername());
        return new AuthResponse(userResponse, accessToken, refreshToken);
    }

    /**
     * Logout user by revoking the JWT token.
     *
     * @param token the JWT token to revoke
     */
    @Transactional
    public void logout(String token) {
        log.info("Logging out user with token");

        Date expiration = jwtService.getExpirationDate(token);
        LocalDateTime expiresAt = expiration.toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime();

        RevokedToken revokedToken = new RevokedToken(null, token, null, expiresAt);
        revokedTokenRepository.save(revokedToken);

        log.info("Token revoked successfully");
    }

    /**
     * Refresh JWT tokens using refresh token.
     *
     * @param refreshToken the refresh token
     * @return AuthResponse with new tokens
     * @throws IllegalArgumentException if refresh token is invalid
     */
    @Transactional(readOnly = true)
    public AuthResponse refreshTokens(String refreshToken) {
        log.info("Refreshing tokens");

        if (!jwtService.validateToken(refreshToken)) {
            log.warn("Invalid refresh token");
            throw new IllegalArgumentException("Invalid refresh token");
        }

        String username = jwtService.extractUsername(refreshToken);
        User user = userRepository.findByUsername(username).orElseThrow(() -> new IllegalArgumentException("User not found"));

        String newAccessToken = jwtService.generateAccessToken(username);
        String newRefreshToken = jwtService.generateRefreshToken(username);
        UserResponse userResponse = userMapper.toUserResponse(user);

        log.info("Tokens refreshed for user: {}", username);
        return new AuthResponse(userResponse, newAccessToken, newRefreshToken);
    }

    /**
     * Get current authenticated user.
     *
     * @param username the username
     * @return UserResponse
     * @throws IllegalArgumentException if user not found
     */
    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(String username) {
        log.info("Retrieving current user: {}", username);

        User user = userRepository.findByUsername(username).orElseThrow(() -> new IllegalArgumentException("User not found"));
        return userMapper.toUserResponse(user);
    }
}