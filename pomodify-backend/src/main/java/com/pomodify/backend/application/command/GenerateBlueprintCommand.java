package com.pomodify.backend.application.command;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Builder;

/**
 * Command for generating an AI activity blueprint.
 */
@Builder
public record GenerateBlueprintCommand(
        @NotBlank(message = "Topic is required")
        @Size(max = 50, message = "Topic must be 50 characters or less")
        String topic
) {
}
