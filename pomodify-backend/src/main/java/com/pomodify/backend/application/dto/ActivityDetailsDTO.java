package com.pomodify.backend.application.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class ActivityDetailsDTO {
    private Long id;
    private String name;
    private String categoryName;
    private String description;
    private LocalDateTime scheduledAt;
    private List<SessionDTO> sessions;
    private int totalCompletedSessions;
    private long totalDurationMinutes;
}