package com.pomodify.backend.presentation.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiSuggestionRequest {
    private Long activityId;
    private List<String> currentTodos; // Existing todos to avoid duplicates
}
