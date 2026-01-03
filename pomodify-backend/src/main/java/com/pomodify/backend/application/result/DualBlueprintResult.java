package com.pomodify.backend.application.result;

import lombok.Builder;
import java.util.List;

/**
 * Result for dual AI-generated blueprints (beginner & intermediate).
 */
@Builder
public record DualBlueprintResult(
        BlueprintPlanResult beginnerPlan,
        BlueprintPlanResult intermediatePlan,
        boolean isFallback
) {
    @Builder
    public record BlueprintPlanResult(
            String level,
            String activityTitle,
            String activityDescription,
            int focusMinutes,
            int breakMinutes,
            List<String> todos,
            String tipNote
    ) {}
}
