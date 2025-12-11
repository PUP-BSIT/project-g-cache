package com.pomodify.backend.application.service;

import com.pomodify.backend.application.command.auth.LoginUserCommand;
import com.pomodify.backend.application.command.auth.LogoutCommand;
import com.pomodify.backend.application.command.auth.RefreshTokensCommand;
import com.pomodify.backend.application.command.auth.RegisterUserCommand;
import com.pomodify.backend.application.result.AuthResult;
import com.pomodify.backend.application.result.UserResult;
import com.pomodify.backend.application.validator.RegistrationValidator;
import com.pomodify.backend.domain.factory.UserFactory;
import com.pomodify.backend.domain.model.User;
import com.pomodify.backend.domain.repository.UserRepository;
import com.pomodify.backend.domain.valueobject.Email;
import com.pomodify.backend.domain.model.RevokedToken;
import com.pomodify.backend.domain.repository.RevokedTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;

    private final PasswordEncoder passwordEncoder;

    private final RegistrationValidator registrationValidator;

    private final UserFactory userFactory;

    private final JwtService jwtService;

    private final RevokedTokenRepository revokedTokenRepository;

    // Register
    @Transactional
    public UserResult registerUser(RegisterUserCommand command) {
        registrationValidator.validateRegistration(command.firstName(), command.lastName(), command.email(), command.password());

        Email emailVO = Email.of(command.email());
        if (userRepository.existsByEmail(emailVO)) {
            throw new IllegalArgumentException("Email already exists");
        }

        String passwordHash = passwordEncoder.encode(command.password());
        User savedUser = userRepository.save(userFactory.createUser(command.firstName(), command.lastName(), emailVO, passwordHash));

        return UserResult.builder()
                .firstName(savedUser.getFirstName())
                .lastName(savedUser.getLastName())
                .email(savedUser.getEmail().getValue())
                .build();
    }

    // Login
    @Transactional(readOnly = true)
    public AuthResult loginUser(LoginUserCommand command) {
        Email emailVO = Email.of(command.email());

        User user = userRepository.findByEmail(emailVO)
                .orElse(null);

        if (user == null || !user.isActive() || !passwordEncoder.matches(command.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid credentials or inactive account");
        }

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        return AuthResult.builder()
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail().getValue())
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .build();
    }

    // Refresh Tokens
    @Transactional(readOnly = true)
    public AuthResult refreshTokens(RefreshTokensCommand command) {

        String refreshToken = command.refreshToken();

        if (!jwtService.validateToken(command.refreshToken())) {
            throw new BadCredentialsException("Invalid refresh token");
        }

        Long userId = jwtService.extractUserIdFrom(refreshToken);

        User user = userRepository.findUser(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!user.isActive()) {
            throw new IllegalArgumentException("Inactive user cannot refresh tokens");
        }

        String newAccessToken = jwtService.generateAccessToken(user);
        String newRefreshToken = jwtService.generateRefreshToken(user);

        return AuthResult.builder()
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail().getValue())
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .build();
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
        Email emailVO = Email.of(email);
        User user = userRepository.findByEmail(emailVO)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!user.isActive()) {
            throw new IllegalStateException("Inactive user cannot be retrieved");
        }

        return UserResult.builder()
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail().getValue())
                .build();
    }
}
