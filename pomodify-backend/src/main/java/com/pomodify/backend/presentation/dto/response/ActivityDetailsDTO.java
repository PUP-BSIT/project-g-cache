package com.pomodify.backend.presentation.dto.response;

import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActivityDetailsDTO {
    private Long id;
    private String name;
    private String description;
    private String status;
    private Long categoryId;
    private LocalDateTime scheduledTime;
    private Long userId;
    private int durationMinutes;
    private int totalFocusTimeMinutes;
    private int totalBreakTimeMinutes;
    private List<SessionDTO> sessions;
}