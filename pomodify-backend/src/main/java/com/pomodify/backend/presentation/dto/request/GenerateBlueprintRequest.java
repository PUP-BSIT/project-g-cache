package com.pomodify.backend.presentation.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for generating an AI activity blueprint.
 */
public record GenerateBlueprintRequest(
        @NotBlank(message = "Topic is required")
        @Size(max = 50, message = "Topic must be 50 characters or less")
        String topic
) {
}
