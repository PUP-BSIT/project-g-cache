package com.pomodify.backend.application.service;

import com.pomodify.backend.application.command.auth.LoginUserCommand;
import com.pomodify.backend.application.command.auth.LogoutCommand;
import com.pomodify.backend.application.command.auth.RefreshTokensCommand;
import com.pomodify.backend.application.command.auth.RegisterUserCommand;
import com.pomodify.backend.application.result.AuthResult;
import com.pomodify.backend.application.result.UserResult;
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
    private RevokedTokenRepository revokedTokenRepository;

    // Register
    @Transactional
    public UserResult registerUser(RegisterUserCommand command) {
        registrationValidator.validateRegistration(command.firstName(), command.lastName(), command.email(), command.password());

        Email emailVO = new Email(command.email());
        if (userRepository.existsByEmail(emailVO)) {
            throw new IllegalArgumentException("Email already exists");
        }

        String passwordHash = passwordEncoder.encode(command.password());
        User user = userFactory.createUser(command.firstName(), command.lastName(), emailVO, passwordHash);
        User savedUser = userRepository.save(user);

        return new UserResult(savedUser.getFirstName(), savedUser.getLastName(), savedUser.getEmail().getValue());
    }

    // Login
    @Transactional(readOnly = true)
    public AuthResult loginUser(LoginUserCommand command) {
        Email emailVO = new Email(command.email());

        User user = userRepository.findByEmail(emailVO)
                .orElse(null);

        if (user == null || !user.isActive() || !passwordEncoder.matches(command.password(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid credentials or inactive account");
        }

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        return new AuthResult(user.getFirstName(), user.getLastName(), user.getEmail().getValue(), accessToken, refreshToken);
    }

    // Refresh Tokens
    @Transactional(readOnly = true)
    public AuthResult refreshTokens(RefreshTokensCommand command) {

        String refreshToken = command.refreshToken();

        if (!jwtService.validateToken(command.refreshToken())) {
            throw new IllegalArgumentException("Invalid refresh token");
        }

        Long userId = jwtService.extractUserId(refreshToken);
        String username = jwtService.extractUserEmail(refreshToken);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!user.isActive()) {
            throw new IllegalArgumentException("Inactive user cannot refresh tokens");
        }

        String newAccessToken = jwtService.generateAccessToken(user);
        String newRefreshToken = jwtService.generateRefreshToken(user);

        return new AuthResult(
                user.getFirstName(),
                user.getLastName(),
                user.getEmail().getValue(),
                newAccessToken,
                newRefreshToken);
    }

    // Logout
    @Transactional
    public String logout(LogoutCommand command) {
        RevokedToken revokedToken = RevokedToken.builder()
                .token(command.token())
                .build();
        revokedTokenRepository.save(revokedToken);

        return "Logout successful";
    }

    // Get Current User
    @Transactional(readOnly = true)
    public UserResult getCurrentUser(String email) {
        Email emailVO = new Email(email);
        User user = userRepository.findByEmail(emailVO)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!user.isActive()) {
            throw new IllegalStateException("Inactive user cannot be retrieved");
        }

        return new UserResult(user.getFirstName(), user.getFirstName(), user.getEmail().getValue());
    }
}
