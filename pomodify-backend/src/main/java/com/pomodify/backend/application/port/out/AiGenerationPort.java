package com.pomodify.backend.application.port.out;

import com.pomodify.backend.application.result.AiSuggestionResult;
import com.pomodify.backend.application.result.DualBlueprintResult;
import com.pomodify.backend.domain.model.ai.AiActivityBlueprint;

import java.util.List;

public interface AiGenerationPort {
    AiSuggestionResult predictNextStep(String activityTitle, List<String> pastNotes, List<String> currentTodos);
    
    /**
     * Generates an activity blueprint based on a topic.
     * Used by the AI Wizard for the Smart-Action System.
     *
     * @param topic The topic/subject for the activity (e.g., "Coding", "Writing")
     * @return AiActivityBlueprint containing suggested activity settings
     */
    AiActivityBlueprint generateBlueprint(String topic);
    
    /**
     * Generates dual activity blueprints (beginner & intermediate) based on a topic.
     * Each plan includes todos and tip notes.
     *
     * @param topic The topic/subject for the activity
     * @param previousSuggestions Previous suggestions to avoid (for regeneration)
     * @return DualBlueprintResult containing both beginner and intermediate plans
     */
    DualBlueprintResult generateDualBlueprints(String topic, List<String> previousSuggestions);
}
