package com.pomodify.backend.presentation.dto.response;

import lombok.Builder;
import java.util.List;

/**
 * Response DTO for AI-generated dual activity blueprint preview (beginner & intermediate).
 */
@Builder
public record DualBlueprintResponse(
        String message,
        BlueprintPlan beginnerPlan,
        BlueprintPlan intermediatePlan,
        boolean isFallback
) {
    @Builder
    public record BlueprintPlan(
            String level,
            String activityTitle,
            String activityDescription,
            int focusMinutes,
            int breakMinutes,
            List<String> todos,
            String tipNote
    ) {}
}
