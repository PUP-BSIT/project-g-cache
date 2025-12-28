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
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.MediaType;
@RestController
@RequestMapping("/auth")
@Tag(name = "Auth", description = "User registration, login and token management")
@Slf4j
public class AuthController {

    // Utility method for manual Set-Cookie header (matches OAuth2 handler)
    private void setAuthCookieHeaders(HttpServletResponse response, String accessToken, String refreshToken, boolean isSecure) {
    String accessTokenCookie = String.format(
        "accessToken=%s; Path=/; HttpOnly; SameSite=None; Max-Age=%d; Expires=%s; Secure",
        accessToken,
        60 * 60,
        java.time.format.DateTimeFormatter.RFC_1123_DATE_TIME.format(java.time.ZonedDateTime.now(java.time.ZoneOffset.UTC).plusSeconds(60 * 60))
    );
    String refreshTokenCookie = String.format(
        "refreshToken=%s; Path=/; HttpOnly; SameSite=None; Max-Age=%d; Expires=%s; Secure",
        refreshToken,
        7 * 24 * 60 * 60,
        java.time.format.DateTimeFormatter.RFC_1123_DATE_TIME.format(java.time.ZonedDateTime.now(java.time.ZoneOffset.UTC).plusSeconds(7 * 24 * 60 * 60))
    );
    response.setHeader("Set-Cookie", accessTokenCookie);
    response.addHeader("Set-Cookie", refreshTokenCookie);
    log.info("Set-Cookie header for accessToken set");
    log.info("Set-Cookie header for refreshToken set");
    }

    private final AuthService authService;
    private final JwtService jwtService;

    public AuthController(AuthService authService, JwtService jwtService) {
        this.authService = authService;
        this.jwtService = jwtService;
    }

    @PostMapping("/register")
    @Operation(summary = "Register a new user")
    public ResponseEntity<UserResponse> register(@RequestBody @Valid RegisterRequest request, @RequestHeader(value = "Origin", required = false) String origin, @RequestHeader(value = "Referer", required = false) String referer) {
        log.info("Registration request received for user with email: {}", request.email());

        RegisterUserCommand command = RegisterUserCommand.builder()
                .firstName(request.firstName())
                .lastName(request.lastName())
                .email(request.email())
                .password(request.password())
                .build();

        String baseUrl = (origin != null) ? origin : (referer != null ? referer.split("/", 4)[0] + "//" + referer.split("/", 4)[2] : null);
        UserResponse response = UserMapper.toUserResponse(authService.registerUser(command, baseUrl));

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
        boolean isSecure = true; // Always secure in production
        setAuthCookieHeaders(response, authResponse.accessToken(), authResponse.refreshToken(), isSecure);
        log.info("User logged in successfully: {} (tokens set as HTTP-only cookies)", request.email());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/logout")
    @Operation(summary = "Logout current user by revoking token")
    public ResponseEntity<LogoutResponse> logout(HttpServletRequest request, HttpServletResponse response) {
        log.info("Logout request received");
        // Clear cookies using manual Set-Cookie headers
        String clearAccessToken = String.format(
                "accessToken=; Path=/; HttpOnly; SameSite=None; Max-Age=0; Expires=%s; Secure",
                java.time.format.DateTimeFormatter.RFC_1123_DATE_TIME.format(java.time.ZonedDateTime.now(java.time.ZoneOffset.UTC))
        );
        String clearRefreshToken = String.format(
                "refreshToken=; Path=/; HttpOnly; SameSite=None; Max-Age=0; Expires=%s; Secure",
                java.time.format.DateTimeFormatter.RFC_1123_DATE_TIME.format(java.time.ZonedDateTime.now(java.time.ZoneOffset.UTC))
        );
        response.setHeader("Set-Cookie", clearAccessToken);
        response.addHeader("Set-Cookie", clearRefreshToken);
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

        // Set new cookies using manual Set-Cookie headers
        boolean isSecure = true;
        setAuthCookieHeaders(response, authResponse.accessToken(), authResponse.refreshToken(), isSecure);

        log.info("Tokens refreshed successfully");
        return ResponseEntity.ok(authResponse);
    }

    @GetMapping("/oauth2/google")
    @Operation(summary = "Trigger Google OAuth2 login")
    public void googleOAuth2Login(HttpServletResponse response) throws IOException {
        // Redirect to Spring Security's OAuth2 login flow for Google
        response.setStatus(HttpServletResponse.SC_FOUND);
        response.setHeader("Location", "/oauth2/authorization/google");
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
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(null);
        }
        String email;
        try {
            email = jwtService.extractUserEmailFrom(token);
        } catch (Exception e) {
            log.warn("Invalid JWT in accessToken cookie: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(null);
        }
        log.info("/users/me request received for user with email: {}", email);
        UserResponse userResponse = UserMapper.toUserResponse(authService.getCurrentUser(email));
        log.info("Current user retrieved successfully");
        return ResponseEntity.ok(userResponse);
    }

        // ──────────────── Email Verification ────────────────
    @GetMapping(value = "/verify", produces = "application/json")
    @Operation(summary = "Verify user email with token")
    public ResponseEntity<?> verifyEmail(@RequestParam("token") String token) {
        try {
            authService.verifyEmailToken(token);
            return ResponseEntity.ok(new VerificationResponse(true, "Account verified successfully."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new VerificationResponse(false, e.getMessage()));
        }
    }

    public static class VerificationResponse {
        public final boolean success;
        public final String message;
        public VerificationResponse(boolean success, String message) {
            this.success = success;
            this.message = message;
        }
    }

    // ──────────────── Password Reset Request ────────────────
    @PostMapping(value = "/request-password-reset", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Request password reset (sends email)")
    public ResponseEntity<String> requestPasswordReset(@RequestBody String email) {
        try {
            authService.requestPasswordReset(email.replaceAll("\"", ""));
            return ResponseEntity.ok("Password reset instructions sent (if user exists)");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    // ──────────────── Verify and Reset ────────────────
    @GetMapping("/verify-and-reset")
    @Operation(summary = "Verify email and redirect to password reset")
    public ResponseEntity<String> verifyAndReset(@RequestParam("token") String token) {
        try {
            String result = authService.verifyAndReset(token);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }
}
