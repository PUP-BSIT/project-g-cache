package com.pomodify.backend.application.command;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class GenerateNextStepCommand {
    private Long userId;
    private Long activityId;
    private List<String> currentTodos; // Existing todos to avoid duplicates
}
