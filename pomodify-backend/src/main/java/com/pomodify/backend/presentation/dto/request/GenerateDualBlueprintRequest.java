package com.pomodify.backend.presentation.dto.request;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record GenerateDualBlueprintRequest(
    @NotBlank(message = "Topic is required")
    String topic,
    
    List<String> previousSuggestions
) {
    public GenerateDualBlueprintRequest {
        if (previousSuggestions == null) {
            previousSuggestions = List.of();
        }
    }
}
