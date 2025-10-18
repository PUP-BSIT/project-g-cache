package com.pomodify.backend.presentation.controllers;

import com.pomodify.backend.application.dto.request.RegisterRequest;
import com.pomodify.backend.application.dto.response.ApiResponse;
import com.pomodify.backend.application.dto.response.UserResponse;
import com.pomodify.backend.application.services.AuthService;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
     * TODO: Implement login functionality
     */
    @PostMapping("/login")
    public ResponseEntity<?> login() {
        // TODO: Implement login
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
                .body(ApiResponse.error("Login endpoint not yet implemented", "NOT_IMPLEMENTED"));
    }

    /**
     * Logout user and invalidate session.
     * TODO: Implement logout functionality
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        // TODO: Implement logout
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
                .body(ApiResponse.error("Logout endpoint not yet implemented", "NOT_IMPLEMENTED"));
    }

    /**
     * Refresh JWT access token using refresh token.
     * TODO: Implement token refresh functionality
     */
    @PostMapping("/refresh")
    public ResponseEntity<?> refresh() {
        // TODO: Implement token refresh
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
                .body(ApiResponse.error("Refresh endpoint not yet implemented", "NOT_IMPLEMENTED"));
    }

    /**
     * Get current authenticated user information.
     * TODO: Implement get current user functionality
     */
    @GetMapping("/me")
    public ResponseEntity<?> me() {
        // TODO: Implement get current user
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
                .body(ApiResponse.error("Me endpoint not yet implemented", "NOT_IMPLEMENTED"));
    }
}
