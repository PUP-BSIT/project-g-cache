package com.pomodify.backend.presentation.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for confirming and saving an AI-generated blueprint.
 * User can optionally modify the title before confirming.
 */
public record ConfirmBlueprintRequest(
        @NotBlank(message = "Activity title is required")
        @Size(max = 100, message = "Title must be 100 characters or less")
        String activityTitle,

        @Size(max = 500, message = "Description must be 500 characters or less")
        String activityDescription,

        @Min(value = 5, message = "Focus duration must be at least 5 minutes")
        @Max(value = 120, message = "Focus duration cannot exceed 120 minutes")
        int focusMinutes,

        @Min(value = 2, message = "Break duration must be at least 2 minutes")
        @Max(value = 30, message = "Break duration cannot exceed 30 minutes")
        int breakMinutes,

        @Size(max = 500, message = "First session note must be 500 characters or less")
        String firstSessionNote,

        Long categoryId
) {
}
