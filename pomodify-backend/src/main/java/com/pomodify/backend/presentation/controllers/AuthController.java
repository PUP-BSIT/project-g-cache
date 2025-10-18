package com.pomodify.backend.presentation.controllers;

import com.pomodify.backend.application.dto.request.RegisterRequest;
import com.pomodify.backend.application.dto.request.LoginRequest;
import com.pomodify.backend.application.dto.request.RefreshRequest;
import com.pomodify.backend.application.dto.response.ApiResponse;
import com.pomodify.backend.application.dto.response.UserResponse;
import com.pomodify.backend.application.dto.response.AuthResponse;
import com.pomodify.backend.application.services.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * REST Controller for authentication endpoints.
 * Handles user registration, login, logout, token refresh, and current user retrieval.
 */
@RestController
@RequestMapping("/api/v1/auth")
@Slf4j
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * Register a new user.
     *
     * @param request RegisterRequest containing username, email, and password
     * @return ApiResponse with UserResponse data
     */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserResponse>> register(@RequestBody @Valid RegisterRequest request) {
        log.info("Registration request received for username: {}", request.username());

        UserResponse userResponse = authService.registerUser(request);

        log.info("User registered successfully: {}", request.username());
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("User registered successfully", userResponse));
    }

    /**
     * Authenticate user and generate JWT token.
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@RequestBody @Valid LoginRequest request) {
        log.info("Login request received for: {}", request.usernameOrEmail());

        AuthResponse authResponse = authService.loginUser(request);

        log.info("User logged in successfully: {}", request.usernameOrEmail());
        return ResponseEntity.ok(ApiResponse.success("Login successful", authResponse));
    }

    /**
     * Logout user and invalidate session.
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        log.info("Logout request received");

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid token", "INVALID_TOKEN"));
        }

        String token = authHeader.substring(7);
        authService.logout(token);

        log.info("User logged out successfully");
        return ResponseEntity.ok(ApiResponse.success("Logged out successfully", null));
    }

    /**
     * Refresh JWT access token using refresh token.
     */
    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody @Valid RefreshRequest request) {
        log.info("Refresh request received");

        AuthResponse authResponse = authService.refreshTokens(request.refreshToken());

        log.info("Tokens refreshed successfully");
        return ResponseEntity.ok(ApiResponse.success("Tokens refreshed", authResponse));
    }

    /**
     * Get current authenticated user information.
     */
    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication authentication) {
        log.info("Me request received for user: {}", authentication.getName());

        UserResponse userResponse = authService.getCurrentUser(authentication.getName());

        log.info("Current user retrieved successfully");
        return ResponseEntity.ok(ApiResponse.success("Current user retrieved", userResponse));
    }
}
