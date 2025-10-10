package com.pomodify.backend.services;

import com.pomodify.backend.domain.dto.*;
import com.pomodify.backend.domain.model.User;
import com.pomodify.backend.domain.model.UserSession;
import com.pomodify.backend.domain.valueobject.Email;
import com.pomodify.backend.exception.AuthenticationException;
import com.pomodify.backend.factory.UserFactory;
import com.pomodify.backend.repository.UserRepository;
import com.pomodify.backend.repository.UserSessionRepository;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.codec.digest.DigestUtils;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@Transactional
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final UserSessionRepository sessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final UserFactory userFactory; // Add UserFactory injection

    public AuthService(UserRepository userRepository,
                       UserSessionRepository sessionRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       UserFactory userFactory) { // Add UserFactory parameter
        this.userRepository = userRepository;
        this.sessionRepository = sessionRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.userFactory = userFactory; // Initialize UserFactory
    }

    public RegisterResponse register(RegisterRequest request) {
        try {
            // Check if user already exists
            if (userRepository.findByUsername(request.username()).isPresent()) {
                throw new IllegalArgumentException("Username already exists");
            }

            if (userRepository.findByEmail(new Email(request.email())).isPresent()) {
                throw new IllegalArgumentException("Email already exists");
            }

            // Create new user using injected UserFactory instance
            User user = userFactory.createUser(request);

            userRepository.save(user);
            log.info("User {} registered successfully", user.getUsername());

            return new RegisterResponse("Registration successful");

        } catch (DataIntegrityViolationException e) {
            log.error("Data integrity violation during user registration", e);
            throw new IllegalArgumentException("Registration failed due to data constraints");
        }
    }

    public LoginResponse login(LoginRequest request, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        // Find user by username or email
        User user = userRepository.findByUsername(request.usernameOrEmail())
                .or(() -> userRepository.findByEmail(new Email(request.usernameOrEmail())))
                .orElseThrow(() -> new AuthenticationException("Invalid credentials"));

        // Use getPasswordHash() instead of getPassword()
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new AuthenticationException("Invalid credentials");
        }

        // Generate session
        String sessionId = UUID.randomUUID().toString();
        String refreshToken = jwtService.generateRefreshToken(user.getUsername());
        String accessToken = jwtService.generateAccessToken(user.getUsername(), sessionId);

        // Save session
        UserSession session = UserSession.builder()
                .sessionId(sessionId)
                .userId(user.getId())
                .refreshToken(hashRefreshToken(refreshToken))
                .deviceInfo(extractDeviceInfo(httpRequest))
                .ipHash(hashIp(getClientIp(httpRequest)))
                .lastUsedAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusDays(30))
                .build();

        sessionRepository.save(session);

        // Set refresh token as HttpOnly cookie
        Cookie refreshCookie = new Cookie("refreshToken", refreshToken);
        refreshCookie.setHttpOnly(true);
        refreshCookie.setSecure(true);
        refreshCookie.setPath("/");
        refreshCookie.setMaxAge(30 * 24 * 60 * 60); // 30 days
        refreshCookie.setAttribute("SameSite", "Strict");
        httpResponse.addCookie(refreshCookie);

        log.info("User {} logged in successfully with session {}", user.getUsername(), sessionId);

        return new LoginResponse(
                accessToken,
                "Bearer",
                900L, // 15 minutes in seconds
                UserDto.from(user)
        );
    }

    @Transactional
    public LogoutResponse logout(String sessionId, HttpServletResponse response) {
        if (sessionId != null) {
            sessionRepository.revokeSession(sessionId);
            log.info("Session {} revoked", sessionId);
        }

        // Clear refresh token cookie
        Cookie refreshCookie = new Cookie("refreshToken", "");
        refreshCookie.setHttpOnly(true);
        refreshCookie.setSecure(true);
        refreshCookie.setPath("/");
        refreshCookie.setMaxAge(0);
        response.addCookie(refreshCookie);

        return new LogoutResponse("Logged out");
    }

    @Transactional
    public RefreshResponse refreshToken(String refreshToken, HttpServletRequest request, HttpServletResponse response) {
        if (!jwtService.isTokenValid(refreshToken)) {
            throw new AuthenticationException("Invalid refresh token");
        }

        String hashedRefreshToken = hashRefreshToken(refreshToken);
        UserSession session = sessionRepository.findByRefreshTokenAndRevokedFalse(hashedRefreshToken)
                .orElseThrow(() -> {
                    log.warn("Attempted use of invalid/stolen refresh token");
                    return new AuthenticationException("Invalid refresh token");
                });

        // Check if token is expired
        if (session.getExpiresAt().isBefore(LocalDateTime.now())) {
            sessionRepository.revokeSession(session.getSessionId());
            throw new AuthenticationException("Refresh token expired");
        }

        User user = userRepository.findById(session.getUserId())
                .orElseThrow(() -> new AuthenticationException("User not found"));

        // Rotate refresh token
        String newRefreshToken = jwtService.generateRefreshToken(user.getUsername());
        String newAccessToken = jwtService.generateAccessToken(user.getUsername(), session.getSessionId());

        // Update session
        session.setRefreshToken(hashRefreshToken(newRefreshToken));
        session.setLastUsedAt(LocalDateTime.now());
        sessionRepository.save(session);

        // Set new refresh token cookie
        Cookie refreshCookie = new Cookie("refreshToken", newRefreshToken);
        refreshCookie.setHttpOnly(true);
        refreshCookie.setSecure(true);
        refreshCookie.setPath("/");
        refreshCookie.setMaxAge(30 * 24 * 60 * 60);
        refreshCookie.setAttribute("SameSite", "Strict");
        response.addCookie(refreshCookie);

        log.info("Token refreshed for session {}", session.getSessionId());

        return new RefreshResponse(
                newAccessToken,
                "Bearer",
                900L
        );
    }

    public MeResponse getCurrentUser(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AuthenticationException("User not found"));

        return MeResponse.from(user);
    }

    public boolean isSessionValid(String sessionId) {
        return sessionRepository.findById(sessionId)
                .map(session -> !session.getRevoked() && session.getExpiresAt().isAfter(LocalDateTime.now()))
                .orElse(false);
    }

    private String hashRefreshToken(String refreshToken) {
        return DigestUtils.sha256Hex(refreshToken);
    }

    private String extractDeviceInfo(HttpServletRequest request) {
        String userAgent = request.getHeader("User-Agent");
        return userAgent != null ? userAgent.substring(0, Math.min(userAgent.length(), 255)) : "Unknown";
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private String hashIp(String ip) {
        return DigestUtils.sha256Hex(ip + "salt");
    }
}
