package com.pomodify.backend.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionDTO {
    private Long id;
    private int durationMinutes;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String notes;
    private boolean completed;
}