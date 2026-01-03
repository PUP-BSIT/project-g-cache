package com.pomodify.backend.presentation.dto.request.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ForgotPasswordBackupEmailRequest(
    @NotBlank(message = "Primary email is required")
    @Email(message = "Invalid primary email format")
    String email,
    
    @NotBlank(message = "Backup email is required")
    @Email(message = "Invalid backup email format")
    String backupEmail
) {}
