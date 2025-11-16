package com.pomodify.backend.presentation.controller;

import com.pomodify.backend.application.command.auth.LoginUserCommand;
import com.pomodify.backend.application.command.auth.RegisterUserCommand;
import com.pomodify.backend.application.command.auth.RefreshTokensCommand;
import com.pomodify.backend.application.command.auth.LogoutCommand;
import com.pomodify.backend.application.result.AuthResult;
import com.pomodify.backend.application.result.UserResult;
import com.pomodify.backend.application.service.AuthService;
import com.pomodify.backend.presentation.dto.request.LoginRequest;
import com.pomodify.backend.presentation.dto.request.RegisterRequest;
import com.pomodify.backend.presentation.dto.request.RefreshTokensRequest;
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
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@Slf4j
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
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

        UserResult result = authService.registerUser(command);
        UserResponse response = UserMapper.toUserResponse(result);

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

        AuthResult result = authService.loginUser(command);
        AuthResponse response = AuthMapper.toAuthResponse(result);

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

        String message = authService.logout(command); // service returns string
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
        AuthResult result = authService.refreshTokens(command);
        AuthResponse response = AuthMapper.toAuthResponse(result);

        log.info("Tokens refreshed successfully");
        return ResponseEntity.ok(response);
    }

    // ──────────────── Current User ────────────────
    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(Authentication authentication) {
        String email = authentication.getName();
        log.info("Me request received for user with email: {}", email);

        UserResult userResult = authService.getCurrentUser(email);
        UserResponse userResponse = UserMapper.toUserResponse(userResult);

        log.info("Current user retrieved successfully");
        return ResponseEntity.ok(userResponse);
    }
}
