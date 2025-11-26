package com.pomodify.backend.presentation.dto.response;

import lombok.Builder;

@Builder
public record LogoutResponse(String message) {
}
