package com.pomodify.backend.presentation.controller;

import com.pomodify.backend.application.command.auth.LoginUserCommand;
import com.pomodify.backend.application.command.auth.RegisterUserCommand;
import com.pomodify.backend.application.command.auth.RefreshTokensCommand;
import com.pomodify.backend.application.command.auth.LogoutCommand;
import com.pomodify.backend.application.service.AuthService;
import com.pomodify.backend.application.service.JwtService;
import com.pomodify.backend.presentation.dto.request.auth.LoginRequest;
import com.pomodify.backend.presentation.dto.request.auth.RegisterRequest;
import com.pomodify.backend.presentation.dto.request.auth.RefreshTokensRequest;
import com.pomodify.backend.presentation.dto.response.AuthResponse;
import com.pomodify.backend.presentation.dto.response.LogoutResponse;
import com.pomodify.backend.presentation.dto.response.UserResponse;
import com.pomodify.backend.presentation.mapper.AuthMapper;
import com.pomodify.backend.presentation.mapper.UserMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@Slf4j
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;

    public AuthController(AuthService authService, JwtService jwtService) {
        this.authService = authService;
        this.jwtService = jwtService;
    }

    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(@RequestBody @Valid RegisterRequest request) {
        log.info("Registration request received for user with email: {}", request.email());

        RegisterUserCommand command = RegisterUserCommand.builder()
                .firstName(request.firstName())
                .lastName(request.lastName())
                .email(request.email())
                .password(request.password())
                .build();

        UserResponse response = UserMapper.toUserResponse(authService.registerUser(command));

        log.info("User registered successfully: {}", request.email());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody @Valid LoginRequest request) {
        log.info("Login request received for: {}", request.email());

        LoginUserCommand command = LoginUserCommand.builder()
                .email(request.email())
                .password(request.password())
                .build();

        AuthResponse response = AuthMapper.toAuthResponse(authService.loginUser(command));

        log.info("User logged in successfully: {}", request.email());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<LogoutResponse> logout(HttpServletRequest request) {
        log.info("Logout request received");

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.badRequest()
                    .body(LogoutResponse.builder()
                            .message("Missing or invalid Authorization header")
                            .build());
        }

        String token = authHeader.substring(7);
        LogoutCommand command = LogoutCommand.builder().token(token).build();

        String message = authService.logout(command);
        log.info("User logged out successfully");

        return ResponseEntity.ok(
                LogoutResponse.builder()
                        .message(message)
                        .build()
        );
    }

    // ──────────────── Refresh Tokens ────────────────
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@RequestBody @Valid RefreshTokensRequest request) {
        log.info("Refresh request received");

        RefreshTokensCommand command = new RefreshTokensCommand(request.refreshToken());
        AuthResponse response = AuthMapper.toAuthResponse(authService.refreshTokens(command));

        log.info("Tokens refreshed successfully");
        return ResponseEntity.ok(response);
    }

    // ──────────────── Current User ──────────────q──
    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new IllegalArgumentException("Missing token");
        }

        String token = authHeader.substring(7);
        String email = jwtService.extractUserEmailFrom(token);

        log.info("Me request received for user with email: {}", email);

        UserResponse userResponse = UserMapper.toUserResponse(authService.getCurrentUser(email));

        log.info("Current user retrieved successfully");
        return ResponseEntity.ok(userResponse);
    }
}
