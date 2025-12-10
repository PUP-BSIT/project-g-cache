package com.pomodify.backend.presentation.dto.response;

import com.pomodify.backend.presentation.dto.item.SummaryItem;

public record SummaryResponse(
        String message,
        SummaryItem report
) {}
