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

    @Transactional
    public UserResponse registerUser(RegisterRequest request) {
        log.info("Attempting to register new user: {}", request.getUsername());

        registrationValidator.validateRegistration(request.getUsername(), request.getEmail(), request.getPassword());

        if (userRepository.existsByUsername(request.getUsername())) {
            log.warn("Registration failed: Username '{}' already exists", request.getUsername());
            throw new IllegalArgumentException("Username already exists");
        }

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

    @Transactional(readOnly = true)
    public AuthResponse loginUser(LoginRequest request) {
        log.info("Attempting to login user: {}", request.getUsername());

        User user = userRepository.findByUsername(request.getUsername())
                .orElseGet(() -> userRepository.findByEmail(new Email(request.getUsername())).orElse(null));

        if (user == null || !user.isActive() || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            log.warn("Login failed: Invalid credentials for {}", request.getUsername());
            throw new IllegalArgumentException("Invalid credentials or inactive account");
        }

        String accessToken = jwtService.generateAccessToken(user.getUsername());
        String refreshToken = jwtService.generateRefreshToken(user.getUsername());
        UserResponse userResponse = userMapper.toUserResponse(user);

        log.info("Successfully logged in user: {}", user.getUsername());
        return new AuthResponse(userResponse, accessToken, refreshToken);
    }

    @Transactional
    public void logout(String token) {
        log.info("Logging out user with token");

        Date expiration = jwtService.getExpirationDate(token);
        LocalDateTime expiresAt = expiration.toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime();

        RevokedToken revokedToken = new RevokedToken(null, token, null, expiresAt);
        revokedTokenRepository.save(revokedToken);

        log.info("Token revoked successfully");
    }

    @Transactional(readOnly = true)
    public AuthResponse refreshTokens(String refreshToken) {
        log.info("Refreshing tokens");

        if (!jwtService.validateToken(refreshToken)) {
            log.warn("Invalid refresh token");
            throw new IllegalArgumentException("Invalid refresh token");
        }

        String username = jwtService.extractUsername(refreshToken);
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!user.isActive()) {
            throw new IllegalStateException("Inactive user cannot refresh tokens");
        }

        String newAccessToken = jwtService.generateAccessToken(username);
        String newRefreshToken = jwtService.generateRefreshToken(username);
        UserResponse userResponse = userMapper.toUserResponse(user);

        log.info("Tokens refreshed for user: {}", username);
        return new AuthResponse(userResponse, newAccessToken, newRefreshToken);
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(String username) {
        log.info("Retrieving current user: {}", username);

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!user.isActive()) {
            throw new IllegalStateException("Inactive user cannot be retrieved");
        }

        return userMapper.toUserResponse(user);
    }
}
}