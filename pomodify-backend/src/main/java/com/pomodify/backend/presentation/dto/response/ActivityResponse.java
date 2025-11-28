package com.pomodify.backend.presentation.dto.response;

import com.pomodify.backend.presentation.dto.item.ActivityItem;
import lombok.Builder;
import java.util.List;

@Builder
public record ActivityResponse(
        String message,
        List<ActivityItem> activities,
        int currentPage,
        int totalPages,
        long totalItems
) {
}
