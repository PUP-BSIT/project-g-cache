package com.pomodify.backend.domain.model.ai;

/**
 * Value Object representing an AI-generated activity blueprint.
 * This is a stateless transfer object used before the user confirms and saves to the database.
 */
public record AiActivityBlueprint(
        String activityTitle,
        String activityDescription,
        int focusMinutes,
        int breakMinutes,
        String firstSessionNote
) {
    /**
     * Creates a fallback/template blueprint when AI generation fails.
     */
    public static AiActivityBlueprint createFallback(String topic) {
        String sanitizedTopic = topic != null ? topic.trim() : "General";
        return new AiActivityBlueprint(
                "Learn " + sanitizedTopic,
                "A focused study plan for " + sanitizedTopic,
                25,
                5,
                "Next: Research " + sanitizedTopic + " fundamentals"
        );
    }

    /**
     * Validates and clamps timer values to safe ranges.
     */
    public AiActivityBlueprint withClampedValues() {
        int clampedFocus = Math.max(5, Math.min(focusMinutes, 120));
        int clampedBreak = Math.max(2, Math.min(breakMinutes, 30));
        return new AiActivityBlueprint(
                activityTitle,
                activityDescription,
                clampedFocus,
                clampedBreak,
                firstSessionNote
        );
    }
}
