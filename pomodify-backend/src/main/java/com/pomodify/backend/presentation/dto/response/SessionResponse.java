package com.pomodify.backend.presentation.dto.response;

import com.pomodify.backend.presentation.dto.item.SessionItem;

import java.util.List;

public record SessionResponse(
    String message,
    List<SessionItem> sessions,
    int currentPage,
    int totalPages,
    long totalItems
) {
}
