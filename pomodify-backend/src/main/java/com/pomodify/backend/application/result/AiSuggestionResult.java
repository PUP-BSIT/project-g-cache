package com.pomodify.backend.application.result;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiSuggestionResult {
    private String suggestedNote;
    private String motivationLevel;
    private boolean isFallback;
}
