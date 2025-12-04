package com.pomodify.backend.presentation.dto.item;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class RecentSessionItem {
    Long id;
    Long activityId;
    String activityName;
    LocalDateTime completedAt;
    int cyclesCompleted;
    double focusHours;
}
