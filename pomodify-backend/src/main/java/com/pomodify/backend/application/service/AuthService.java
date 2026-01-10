package com.pomodify.backend.application.service;

import com.pomodify.backend.application.command.auth.LoginUserCommand;
import com.pomodify.backend.application.command.auth.LogoutCommand;
import com.pomodify.backend.application.command.auth.RefreshTokensCommand;
import com.pomodify.backend.application.command.auth.RegisterUserCommand;
import com.pomodify.backend.application.port.EmailPort;
import com.pomodify.backend.application.result.AuthResult;
import com.pomodify.backend.application.result.UserResult;
import com.pomodify.backend.application.validator.RegistrationValidator;
import com.pomodify.backend.domain.factory.UserFactory;
import com.pomodify.backend.domain.model.User;
import com.pomodify.backend.domain.repository.UserRepository;
import com.pomodify.backend.domain.valueobject.Email;
import com.pomodify.backend.domain.model.RevokedToken;
import com.pomodify.backend.domain.repository.RevokedTokenRepository;
import com.pomodify.backend.domain.model.VerificationToken;
import com.pomodify.backend.domain.repository.VerificationTokenRepository;
import com.pomodify.backend.domain.model.PasswordResetToken;
import com.pomodify.backend.domain.repository.PasswordResetTokenRepository;
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

    private final EmailPort emailPort;
    private final VerificationTokenRepository tokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;

    // Register
    @Transactional
    public UserResult registerUser(RegisterUserCommand command, String baseUrl) {
        registrationValidator.validateRegistration(command.firstName(), command.lastName(), command.email(), command.password());

        Email emailVO = Email.of(command.email());
        if (userRepository.existsByEmail(emailVO)) {
            throw new IllegalArgumentException("Email already exists");
        }

        String passwordHash = passwordEncoder.encode(command.password());
        User user = userFactory.createUser(command.firstName(), command.lastName(), emailVO, passwordHash);
        user.setAuthProvider(com.pomodify.backend.domain.enums.AuthProvider.LOCAL);
        user.setEmailVerified(false);
        User savedUser = userRepository.save(user);

        // Token Rotation: Delete existing token if any
        tokenRepository.findByUser(savedUser).ifPresent(token -> {
            tokenRepository.delete(token);
            tokenRepository.flush();
        });
        // Generate new token (24h expiry handled in Entity constructor)
        VerificationToken newToken = new VerificationToken(savedUser);
        tokenRepository.save(newToken);

        // Send verification email
        try {
            emailPort.sendVerificationEmail(savedUser.getEmail().getValue(), newToken.getToken(), baseUrl);
        } catch (Exception e) {
            log.warn("Failed to send verification email to {}: {}", savedUser.getEmail().getValue(), e.getMessage());
        }

        return UserResult.builder()
            .firstName(savedUser.getFirstName())
            .lastName(savedUser.getLastName())
            .email(savedUser.getEmail().getValue())
            .isEmailVerified(savedUser.isEmailVerified())
            .backupEmail(savedUser.getBackupEmail())
            .profilePictureUrl(savedUser.getProfilePictureUrl())
            .build();

    }

    // Email verification logic
    @Transactional
    public String verifyEmailToken(String token) {
        VerificationToken verificationToken = tokenRepository.findByToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Invalid Token"));
        if (verificationToken.isExpired()) {
            throw new IllegalArgumentException("Token Expired");
        }
        User user = verificationToken.getUser();
        user.setEmailVerified(true);
        userRepository.save(user);
        tokenRepository.delete(verificationToken);
        return "Email verified successfully";
    }

    @Transactional
    public void resendVerificationEmail(String email, String baseUrl) {
        Email emailVO = Email.of(email);
        User user = userRepository.findByEmail(emailVO)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (user.isEmailVerified()) {
            throw new IllegalArgumentException("Email already verified");
        }

        // Token Rotation: Delete existing token if any
        tokenRepository.findByUser(user).ifPresent(token -> {
            tokenRepository.delete(token);
            tokenRepository.flush(); // Force delete to happen before insert
        });
        
        // Generate new token
        VerificationToken newToken = new VerificationToken(user);
        tokenRepository.save(newToken);

        // Check if account is locked (grace period expired)
        boolean isLocked = false;
        if (user.getCreatedAt() != null) {
             java.time.LocalDateTime gracePeriodEnd = user.getCreatedAt().plusDays(7);
             if (java.time.LocalDateTime.now().isAfter(gracePeriodEnd)) {
                 isLocked = true;
             }
        }

        // Send verification email
        try {
            // Pass isLocked as the boolean flag to trigger the "Reactivate" template if needed
            emailPort.sendVerificationEmail(user.getEmail().getValue(), newToken.getToken(), baseUrl, isLocked);
        } catch (Exception e) {
            log.error("Failed to send verification email to {}: {}", user.getEmail().getValue(), e.getMessage());
            throw new RuntimeException("Failed to send verification email");
        }
    }

    // Password reset request
    @Transactional
    public void forgotPassword(String email, String baseUrl) {
        Email emailVO = Email.of(email);
        User user = userRepository.findByEmail(emailVO)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Delete existing token if any and flush to avoid constraint violations
        passwordResetTokenRepository.findByUser(user).ifPresent(existingToken -> {
            passwordResetTokenRepository.delete(existingToken);
            passwordResetTokenRepository.flush();
        });

        // Create new token
        PasswordResetToken token = new PasswordResetToken(user);
        passwordResetTokenRepository.save(token);

        // Send email asynchronously - don't throw on failure since email is queued
        try {
            emailPort.sendPasswordResetEmail(user.getEmail().getValue(), token.getToken(), baseUrl);
            log.info("Password reset email queued for: {}", email);
        } catch (Exception e) {
            log.error("Failed to queue password reset email to {}: {}", email, e.getMessage(), e);
            // Don't throw - the token is saved, user can retry or email may still be sent
        }
    }

    // Password reset request via backup email
    @Transactional
    public void forgotPasswordViaBackupEmail(String primaryEmail, String backupEmail, String baseUrl) {
        Email emailVO = Email.of(primaryEmail);
        User user = userRepository.findByEmail(emailVO)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Verify the backup email matches
        if (user.getBackupEmail() == null || !user.getBackupEmail().equalsIgnoreCase(backupEmail)) {
            throw new IllegalArgumentException("Backup email does not match");
        }

        // Delete existing token if any and flush to avoid constraint violations
        passwordResetTokenRepository.findByUser(user).ifPresent(existingToken -> {
            passwordResetTokenRepository.delete(existingToken);
            passwordResetTokenRepository.flush();
        });

        // Create new token
        PasswordResetToken token = new PasswordResetToken(user);
        passwordResetTokenRepository.save(token);

        // Send email to backup email asynchronously
        try {
            emailPort.sendPasswordResetEmail(user.getBackupEmail(), token.getToken(), baseUrl);
            log.info("Password reset email queued for backup email: {}", backupEmail);
        } catch (Exception e) {
            log.error("Failed to queue password reset email to backup email {}: {}", backupEmail, e.getMessage(), e);
            // Don't throw - the token is saved, user can retry or email may still be sent
        }
    }

    // Check if user has backup email configured
    @Transactional(readOnly = true)
    public String checkBackupEmail(String email) {
        Email emailVO = Email.of(email);
        User user = userRepository.findByEmail(emailVO)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (user.getBackupEmail() == null || user.getBackupEmail().isBlank()) {
            return null;
        }

        // Return masked backup email (e.g., j***@gmail.com)
        return maskEmail(user.getBackupEmail());
    }

    // Update backup email for authenticated user
    @Transactional
    public void updateBackupEmail(String userEmail, String backupEmail) {
        Email emailVO = Email.of(userEmail);
        User user = userRepository.findByEmail(emailVO)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Validate backup email is different from primary
        if (user.getEmail().getValue().equalsIgnoreCase(backupEmail)) {
            throw new IllegalArgumentException("Backup email cannot be the same as primary email");
        }

        user.setBackupEmail(backupEmail);
        userRepository.save(user);
    }

    // Helper method to mask email
    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return null;
        }
        String[] parts = email.split("@");
        String localPart = parts[0];
        String domain = parts[1];
        
        if (localPart.length() <= 2) {
            return localPart.charAt(0) + "***@" + domain;
        }
        return localPart.charAt(0) + "***" + localPart.charAt(localPart.length() - 1) + "@" + domain;
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        log.info("Processing password reset request");
        
        PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(token)
                .orElseThrow(() -> {
                    log.warn("Password reset token not found: {}", token.substring(0, Math.min(8, token.length())) + "...");
                    return new IllegalArgumentException("Invalid or expired password reset token");
                });

        log.info("Token found for user ID: {}, expiry: {}, current time: {} (Asia/Manila)", 
                resetToken.getUser().getId(), 
                resetToken.getExpiryDate(), 
                java.time.ZonedDateTime.now(java.time.ZoneId.of("Asia/Manila")));

        if (resetToken.isExpired()) {
            log.warn("Password reset token expired. Expiry: {}, Current: {} (Asia/Manila)", 
                    resetToken.getExpiryDate(), java.time.ZonedDateTime.now(java.time.ZoneId.of("Asia/Manila")));
            // Clean up expired token
            passwordResetTokenRepository.delete(resetToken);
            throw new IllegalArgumentException("Password reset link has expired. Please request a new one.");
        }

        User user = resetToken.getUser();
        
        // Check if user is active before attempting password update
        if (!user.isActive()) {
            log.warn("Attempted password reset for inactive user: {}", user.getEmail().getValue());
            passwordResetTokenRepository.delete(resetToken);
            throw new IllegalArgumentException("This account is inactive. Please contact support.");
        }
        
        // Use setPasswordHash directly to avoid the ensureActive check in updatePassword
        // since we've already verified the user is active
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        log.info("Password updated successfully for user: {}", user.getEmail().getValue());

        passwordResetTokenRepository.delete(resetToken);
        log.info("Password reset token deleted");
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

        // Check verification status with 7-day grace period
        if (!user.isEmailVerified()) {
            if (user.getCreatedAt() != null) {
                java.time.LocalDateTime gracePeriodEnd = user.getCreatedAt().plusDays(7);
                if (java.time.LocalDateTime.now().isAfter(gracePeriodEnd)) {
                    throw new org.springframework.security.authentication.LockedException("Account locked. Verification grace period (7 days) expired. Please verify your email.");
                }
            }
        }

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        return AuthResult.builder()
            .firstName(user.getFirstName())
            .lastName(user.getLastName())
            .email(user.getEmail().getValue())
            .isEmailVerified(user.isEmailVerified())
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
            .isEmailVerified(user.isEmailVerified())
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
            .isEmailVerified(user.isEmailVerified())
            .backupEmail(user.getBackupEmail())
            .profilePictureUrl(user.getProfilePictureUrl())
            .build();
    }

    // Change password for authenticated user
    @Transactional
    public void changePassword(String userEmail, String currentPassword, String newPassword) {
        Email emailVO = Email.of(userEmail);
        User user = userRepository.findByEmail(emailVO)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Verify current password
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new BadCredentialsException("Current password is incorrect");
        }

        // Validate new password is different
        if (passwordEncoder.matches(newPassword, user.getPasswordHash())) {
            throw new IllegalArgumentException("New password must be different from current password");
        }

        // Update password
        user.updatePassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        log.info("Password changed successfully for user: {}", userEmail);
    }

    // Update user profile (name)
    @Transactional
    public UserResult updateProfile(String userEmail, String firstName, String lastName) {
        Email emailVO = Email.of(userEmail);
        User user = userRepository.findByEmail(emailVO)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        user.updateName(firstName, lastName);
        User savedUser = userRepository.save(user);
        log.info("Profile updated successfully for user: {}", userEmail);

        return UserResult.builder()
            .firstName(savedUser.getFirstName())
            .lastName(savedUser.getLastName())
            .email(savedUser.getEmail().getValue())
            .isEmailVerified(savedUser.isEmailVerified())
            .backupEmail(savedUser.getBackupEmail())
            .profilePictureUrl(savedUser.getProfilePictureUrl())
            .build();
    }
}
