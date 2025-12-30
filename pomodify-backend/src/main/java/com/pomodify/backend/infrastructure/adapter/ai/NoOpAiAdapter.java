package com.pomodify.backend.infrastructure.adapter.ai;

import com.pomodify.backend.application.port.out.AiGenerationPort;
import com.pomodify.backend.application.result.AiSuggestionResult;
import com.pomodify.backend.domain.model.ai.AiActivityBlueprint;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * No-op implementation of AiGenerationPort used when AI is disabled.
 * Returns fallback responses without calling any external AI service.
 */
@Component
@ConditionalOnProperty(name = "ai.enabled", havingValue = "false", matchIfMissing = true)
public class NoOpAiAdapter implements AiGenerationPort {

    @Override
    public AiSuggestionResult predictNextStep(String activityTitle, List<String> pastNotes, List<String> currentTodos) {
        return new AiSuggestionResult(
                "Continue working on your task",
                "Med",
                true
        );
    }

    @Override
    public AiActivityBlueprint generateBlueprint(String topic) {
        return AiActivityBlueprint.createFallback(topic);
    }
}
