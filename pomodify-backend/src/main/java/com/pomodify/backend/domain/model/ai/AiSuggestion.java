package com.pomodify.backend.domain.model.ai;

public record AiSuggestion(
    String suggestedNote,
    MotivationLevel motivationLevel,
    boolean isFallback
) {
    public enum MotivationLevel { LOW, MED, HIGH }
}
