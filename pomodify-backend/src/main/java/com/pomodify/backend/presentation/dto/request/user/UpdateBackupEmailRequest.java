package com.pomodify.backend.presentation.dto.request.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record UpdateBackupEmailRequest(
    @NotBlank(message = "Backup email is required")
    @Email(message = "Invalid backup email format")
    String backupEmail
) {}
