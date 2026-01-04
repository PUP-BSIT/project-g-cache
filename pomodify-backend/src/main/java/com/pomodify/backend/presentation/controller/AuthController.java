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
import com.pomodify.backend.presentation.dto.request.auth.ForgotPasswordRequest;
import com.pomodify.backend.presentation.dto.request.auth.ForgotPasswordBackupEmailRequest;
import com.pomodify.backend.presentation.dto.request.auth.ResetPasswordRequest;
import com.pomodify.backend.presentation.dto.request.auth.ResendVerificationRequest;
import com.pomodify.backend.presentation.dto.request.user.UpdateBackupEmailRequest;
import com.pomodify.backend.presentation.dto.request.user.ChangePasswordRequest;
import com.pomodify.backend.presentation.dto.request.user.UpdateProfileRequest;
import com.pomodify.backend.presentation.dto.response.AuthResponse;
import com.pomodify.backend.presentation.dto.response.LogoutResponse;
import com.pomodify.backend.presentation.dto.response.UserResponse;
import com.pomodify.backend.presentation.dto.response.CheckBackupEmailResponse;
import com.pomodify.backend.presentation.mapper.AuthMapper;
import com.pomodify.backend.presentation.mapper.UserMapper;
import com.pomodify.backend.application.service.ProfilePictureService;
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
import org.springframework.web.multipart.MultipartFile;
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
        15 * 60, // 15 minutes
        java.time.format.DateTimeFormatter.RFC_1123_DATE_TIME.format(java.time.ZonedDateTime.now(java.time.ZoneOffset.UTC).plusSeconds(15 * 60))
    );
    String refreshTokenCookie = String.format(
        "refreshToken=%s; Path=/; HttpOnly; SameSite=None; Max-Age=%d; Expires=%s; Secure",
        refreshToken,
        30 * 24 * 60 * 60, // 30 days
        java.time.format.DateTimeFormatter.RFC_1123_DATE_TIME.format(java.time.ZonedDateTime.now(java.time.ZoneOffset.UTC).plusSeconds(30 * 24 * 60 * 60))
    );
    response.setHeader("Set-Cookie", accessTokenCookie);
    response.addHeader("Set-Cookie", refreshTokenCookie);
    log.info("Set-Cookie header for accessToken set (15 min)");
    log.info("Set-Cookie header for refreshToken set (30 days)");
    }

    private final AuthService authService;
    private final JwtService jwtService;
    private final ProfilePictureService profilePictureService;

    public AuthController(AuthService authService, JwtService jwtService, ProfilePictureService profilePictureService) {
        this.authService = authService;
        this.jwtService = jwtService;
        this.profilePictureService = profilePictureService;
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

    @PostMapping("/forgot-password")
    @Operation(summary = "Request password reset")
    public ResponseEntity<Void> forgotPassword(@RequestBody @Valid ForgotPasswordRequest request, @RequestHeader(value = "Origin", required = false) String origin, @RequestHeader(value = "Referer", required = false) String referer) {
        log.info("Forgot password request for: {}", request.email());
        String baseUrl = (origin != null) ? origin : (referer != null ? referer.split("/", 4)[0] + "//" + referer.split("/", 4)[2] : null);
        authService.forgotPassword(request.email(), baseUrl);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/forgot-password/backup")
    @Operation(summary = "Request password reset via backup email")
    public ResponseEntity<Void> forgotPasswordViaBackupEmail(@RequestBody @Valid ForgotPasswordBackupEmailRequest request, @RequestHeader(value = "Origin", required = false) String origin, @RequestHeader(value = "Referer", required = false) String referer) {
        log.info("Forgot password via backup email request for: {}", request.email());
        String baseUrl = (origin != null) ? origin : (referer != null ? referer.split("/", 4)[0] + "//" + referer.split("/", 4)[2] : null);
        authService.forgotPasswordViaBackupEmail(request.email(), request.backupEmail(), baseUrl);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/check-backup-email")
    @Operation(summary = "Check if user has backup email configured")
    public ResponseEntity<CheckBackupEmailResponse> checkBackupEmail(@RequestParam String email) {
        log.info("Check backup email request for: {}", email);
        String maskedBackupEmail = authService.checkBackupEmail(email);
        return ResponseEntity.ok(new CheckBackupEmailResponse(maskedBackupEmail != null, maskedBackupEmail));
    }

    @PostMapping("/users/me/backup-email")
    @Operation(summary = "Update backup email for authenticated user")
    public ResponseEntity<Void> updateBackupEmail(@RequestBody @Valid UpdateBackupEmailRequest request, HttpServletRequest httpRequest) {
        String token = null;
        String authHeader = httpRequest.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        }
        if ((token == null || token.isEmpty()) && httpRequest.getCookies() != null) {
            for (Cookie cookie : httpRequest.getCookies()) {
                if ("accessToken".equals(cookie.getName())) {
                    token = cookie.getValue();
                    break;
                }
            }
        }
        if (token == null || token.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String email;
        try {
            email = jwtService.extractUserEmailFrom(token);
        } catch (Exception e) {
            log.warn("Invalid JWT in accessToken cookie: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        log.info("Update backup email request for user: {}", email);
        authService.updateBackupEmail(email, request.backupEmail());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/users/me/password")
    @Operation(summary = "Change password for authenticated user")
    public ResponseEntity<Void> changePassword(@RequestBody @Valid ChangePasswordRequest request, HttpServletRequest httpRequest) {
        String token = extractToken(httpRequest);
        if (token == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String email;
        try {
            email = jwtService.extractUserEmailFrom(token);
        } catch (Exception e) {
            log.warn("Invalid JWT in accessToken cookie: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        log.info("Change password request for user: {}", email);
        try {
            authService.changePassword(email, request.currentPassword(), request.newPassword());
            return ResponseEntity.ok().build();
        } catch (org.springframework.security.authentication.BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @PutMapping("/users/me")
    @Operation(summary = "Update user profile (name)")
    public ResponseEntity<UserResponse> updateProfile(@RequestBody @Valid UpdateProfileRequest request, HttpServletRequest httpRequest) {
        String token = extractToken(httpRequest);
        if (token == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String email;
        try {
            email = jwtService.extractUserEmailFrom(token);
        } catch (Exception e) {
            log.warn("Invalid JWT in accessToken cookie: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        log.info("Update profile request for user: {}", email);
        UserResponse response = UserMapper.toUserResponse(authService.updateProfile(email, request.firstName(), request.lastName()));
        return ResponseEntity.ok(response);
    }

    // Helper method to extract token from request
    private String extractToken(HttpServletRequest request) {
        String token = null;
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        }
        if ((token == null || token.isEmpty()) && request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("accessToken".equals(cookie.getName())) {
                    token = cookie.getValue();
                    break;
                }
            }
        }
        return (token != null && !token.isEmpty()) ? token : null;
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Reset password with token")
    public ResponseEntity<Void> resetPassword(@RequestBody @Valid ResetPasswordRequest request) {
        log.info("Reset password request received");
        authService.resetPassword(request.token(), request.newPassword());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/resend-verification")
    @Operation(summary = "Resend verification email")
    public ResponseEntity<Void> resendVerification(@RequestBody @Valid ResendVerificationRequest request, @RequestHeader(value = "Origin", required = false) String origin, @RequestHeader(value = "Referer", required = false) String referer) {
        log.info("Resend verification request for: {}", request.email());
        String baseUrl = (origin != null) ? origin : (referer != null ? referer.split("/", 4)[0] + "//" + referer.split("/", 4)[2] : null);
        authService.resendVerificationEmail(request.email(), baseUrl);
        return ResponseEntity.ok().build();
    }

    // ──────────────── Current User ────────────────
    @GetMapping("/users/me")
    @Operation(summary = "Get current authenticated user profile (RESTful)")
    public ResponseEntity<UserResponse> getCurrentUserProfile(HttpServletRequest request) {
        String token = null;
        
        // First, check Authorization header (supports both direct header and filter-converted)
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        }
        
        // Fallback to cookie if no Authorization header
        if ((token == null || token.isEmpty()) && request.getCookies() != null) {
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

    // ──────────────── Profile Picture ────────────────
    @PostMapping(value = "/users/me/profile-picture", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload profile picture")
    public ResponseEntity<UserResponse> uploadProfilePicture(
            @RequestParam("file") MultipartFile file,
            HttpServletRequest httpRequest) {
        String token = extractToken(httpRequest);
        if (token == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String email;
        try {
            email = jwtService.extractUserEmailFrom(token);
        } catch (Exception e) {
            log.warn("Invalid JWT in accessToken cookie: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            log.info("Profile picture upload request for user: {}", email);
            UserResponse response = UserMapper.toUserResponse(profilePictureService.uploadProfilePicture(email, file));
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.warn("Profile picture upload failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (IOException e) {
            log.error("Profile picture upload failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/users/me/profile-picture")
    @Operation(summary = "Delete profile picture")
    public ResponseEntity<UserResponse> deleteProfilePicture(HttpServletRequest httpRequest) {
        String token = extractToken(httpRequest);
        if (token == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String email;
        try {
            email = jwtService.extractUserEmailFrom(token);
        } catch (Exception e) {
            log.warn("Invalid JWT in accessToken cookie: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        log.info("Profile picture delete request for user: {}", email);
        UserResponse response = UserMapper.toUserResponse(profilePictureService.deleteProfilePicture(email));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/users/me/profile-picture/{fileName}")
    @Operation(summary = "Get profile picture by filename")
    public ResponseEntity<byte[]> getProfilePicture(@PathVariable String fileName) {
        try {
            byte[] imageData = profilePictureService.getProfilePicture(fileName);
            String contentType = profilePictureService.getContentType(fileName);
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(imageData);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (IOException e) {
            log.error("Failed to retrieve profile picture: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
