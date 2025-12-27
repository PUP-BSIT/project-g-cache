package com.pomodify.backend.presentation.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiSuggestionResponse {
    private String suggestedNote;
    private String motivationLevel;
    private boolean isFallback;
}
