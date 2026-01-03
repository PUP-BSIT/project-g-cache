package com.pomodify.backend.presentation.dto.response;

public record CheckBackupEmailResponse(
    boolean hasBackupEmail,
    String maskedBackupEmail
) {}
