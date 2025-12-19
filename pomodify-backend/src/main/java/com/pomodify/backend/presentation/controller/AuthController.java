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
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.request.RequestContextHolder;

@RestController
@RequestMapping("/auth")
@Tag(name = "Auth", description = "User registration, login and token management")
@Slf4j
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;

    public AuthController(AuthService authService, JwtService jwtService) {
        this.authService = authService;
        this.jwtService = jwtService;
    }

    @PostMapping("/register")
    @Operation(summary = "Register a new user")
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
    @Operation(summary = "Login with email and password")
    public ResponseEntity<Void> login(@RequestBody @Valid LoginRequest request, HttpServletResponse response) {
        log.info("Login request received for: {}", request.email());

        LoginUserCommand command = LoginUserCommand.builder()
                .email(request.email())
                .password(request.password())
                .build();

        AuthResponse authResponse = AuthMapper.toAuthResponse(authService.loginUser(command));

        // Set HTTP-only cookies for access and refresh tokens
        boolean isSecure = ((HttpServletRequest) RequestContextHolder.getRequestAttributes().resolveReference("request")).isSecure();
        Cookie accessTokenCookie = new Cookie("accessToken", authResponse.accessToken());
        accessTokenCookie.setHttpOnly(true);
        accessTokenCookie.setPath("/");
        accessTokenCookie.setMaxAge(60 * 60); // 1 hour
        accessTokenCookie.setSecure(isSecure);
        accessTokenCookie.setAttribute("SameSite", "None");

        Cookie refreshTokenCookie = new Cookie("refreshToken", authResponse.refreshToken());
        refreshTokenCookie.setHttpOnly(true);
        refreshTokenCookie.setPath("/");
        refreshTokenCookie.setMaxAge(7 * 24 * 60 * 60); // 7 days
        refreshTokenCookie.setSecure(isSecure);
        refreshTokenCookie.setAttribute("SameSite", "None");

        response.addCookie(accessTokenCookie);
        response.addCookie(refreshTokenCookie);

        log.info("User logged in successfully: {} (tokens set as HTTP-only cookies)", request.email());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/logout")
    @Operation(summary = "Logout current user by revoking token")
    public ResponseEntity<LogoutResponse> logout(HttpServletRequest request, HttpServletResponse response) {
        log.info("Logout request received");

        // Always clear cookies, never redirect
        boolean isSecure = request.isSecure();
        Cookie accessTokenCookie = new Cookie("accessToken", "");
        accessTokenCookie.setHttpOnly(true);
        accessTokenCookie.setPath("/");
        accessTokenCookie.setMaxAge(0);
        accessTokenCookie.setSecure(isSecure);
        accessTokenCookie.setAttribute("SameSite", "Strict");

        Cookie refreshTokenCookie = new Cookie("refreshToken", "");
        refreshTokenCookie.setHttpOnly(true);
        refreshTokenCookie.setPath("/");
        refreshTokenCookie.setMaxAge(0);
        refreshTokenCookie.setSecure(isSecure);
        refreshTokenCookie.setAttribute("SameSite", "Strict");

        response.addCookie(accessTokenCookie);
        response.addCookie(refreshTokenCookie);

        // Optionally, invalidate the token in backend if present
        String token = null;
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("accessToken".equals(cookie.getName())) {
                    token = cookie.getValue();
                    break;
                }
            }
        }
        if (token != null && !token.isEmpty()) {
            LogoutCommand command = LogoutCommand.builder().token(token).build();
            authService.logout(command);
        }
        log.info("User logged out and cookies cleared");
        return ResponseEntity.ok(
                LogoutResponse.builder()
                        .message("Logged out and cookies cleared")
                        .build()
        );
    }

    // ──────────────── Refresh Tokens ────────────────
    @PostMapping("/refresh")
    @Operation(summary = "Refresh access and refresh tokens")
    public ResponseEntity<AuthResponse> refresh(
            @RequestBody(required = false) RefreshTokensRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse response) {
        log.info("Refresh request received");

        String refreshToken = null;
        if (request != null && request.refreshToken() != null && !request.refreshToken().isEmpty()) {
            refreshToken = request.refreshToken();
        } else if (httpRequest.getCookies() != null) {
            for (Cookie cookie : httpRequest.getCookies()) {
                if ("refreshToken".equals(cookie.getName())) {
                    refreshToken = cookie.getValue();
                    break;
                }
            }
        }
        if (refreshToken == null || refreshToken.isEmpty()) {
            log.warn("No refresh token provided in body or cookie");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        RefreshTokensCommand command = new RefreshTokensCommand(refreshToken);
        AuthResponse authResponse = AuthMapper.toAuthResponse(authService.refreshTokens(command));

        // Set new HTTP-only cookies for access and refresh tokens
        boolean isSecure = ((HttpServletRequest) RequestContextHolder.getRequestAttributes().resolveReference("request")).isSecure();
        Cookie accessTokenCookie = new Cookie("accessToken", authResponse.accessToken());
        accessTokenCookie.setHttpOnly(true);
        accessTokenCookie.setPath("/");
        accessTokenCookie.setMaxAge(60 * 60); // 1 hour
        accessTokenCookie.setSecure(isSecure);
        accessTokenCookie.setAttribute("SameSite", "None");

        Cookie refreshTokenCookie = new Cookie("refreshToken", authResponse.refreshToken());
        refreshTokenCookie.setHttpOnly(true);
        refreshTokenCookie.setPath("/");
        refreshTokenCookie.setMaxAge(7 * 24 * 60 * 60); // 7 days
        refreshTokenCookie.setSecure(isSecure);
        refreshTokenCookie.setAttribute("SameSite", "None");

        response.addCookie(accessTokenCookie);
        response.addCookie(refreshTokenCookie);

        log.info("Tokens refreshed successfully");
        return ResponseEntity.ok(authResponse);
    }

    @GetMapping("/oauth2/google")
    @Operation(summary = "Trigger Google OAuth2 login")
    public void googleOAuth2Login(HttpServletResponse response) throws IOException {
        // Redirect to Spring Security's OAuth2 login flow for Google
        response.sendRedirect("/oauth2/authorization/google");
    }

    // ──────────────── Current User ──────────────q──
    @GetMapping("/users/me")
    @Operation(summary = "Get current authenticated user profile (RESTful)")
    public ResponseEntity<UserResponse> getCurrentUserProfile(HttpServletRequest request) {
        String token = null;
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("accessToken".equals(cookie.getName())) {
                    token = cookie.getValue();
                    break;
                }
            }
        }
        if (token == null || token.isEmpty()) {
            throw new AuthenticationCredentialsNotFoundException("Missing accessToken cookie");
        }

        String email = jwtService.extractUserEmailFrom(token);

        log.info("/users/me request received for user with email: {}", email);

        UserResponse userResponse = UserMapper.toUserResponse(authService.getCurrentUser(email));

        log.info("Current user retrieved successfully");
        return ResponseEntity.ok(userResponse);
    }
}
