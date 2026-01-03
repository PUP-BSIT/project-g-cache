package com.pomodify.backend.infrastructure.adapter.ai;

import com.pomodify.backend.application.port.out.AiGenerationPort;
import com.pomodify.backend.application.result.AiSuggestionResult;
import com.pomodify.backend.application.result.DualBlueprintResult;
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

    @Override
    public DualBlueprintResult generateDualBlueprints(String topic, List<String> previousSuggestions) {
        return DualBlueprintResult.builder()
                .beginnerPlan(DualBlueprintResult.BlueprintPlanResult.builder()
                        .level("Beginner")
                        .activityTitle(topic + " - Getting Started")
                        .activityDescription("Start your journey with " + topic + " basics")
                        .focusMinutes(25)
                        .breakMinutes(5)
                        .todos(List.of(
                                "Research basic concepts of " + topic,
                                "Set up your learning environment",
                                "Complete a simple introductory exercise"
                        ))
                        .tipNote("Start small and build momentum. Consistency beats intensity!")
                        .build())
                .intermediatePlan(DualBlueprintResult.BlueprintPlanResult.builder()
                        .level("Intermediate")
                        .activityTitle(topic + " - Deep Dive")
                        .activityDescription("Take your " + topic + " skills to the next level")
                        .focusMinutes(50)
                        .breakMinutes(10)
                        .todos(List.of(
                                "Review and strengthen foundational knowledge",
                                "Work on a practical project or challenge",
                                "Document learnings and identify gaps"
                        ))
                        .tipNote("Challenge yourself but don't rush. Deep understanding takes time.")
                        .build())
                .isFallback(true)
                .build();
    }
}
