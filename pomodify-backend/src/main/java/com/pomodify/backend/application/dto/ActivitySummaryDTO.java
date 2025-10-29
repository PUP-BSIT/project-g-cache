package com.pomodify.backend.application.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ActivitySummaryDTO {
    private Long id;
    private String name;
    private String categoryName;
    private int totalSessions;
    private long totalDurationMinutes;
    private boolean isScheduled;
    private boolean isInProgress;
}