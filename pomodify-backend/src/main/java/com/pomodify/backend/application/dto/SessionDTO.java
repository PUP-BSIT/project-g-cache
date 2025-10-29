package com.pomodify.backend.application.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class SessionDTO {
    private Long id;
    private int durationMinutes;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String notes;
    private boolean completed;
}