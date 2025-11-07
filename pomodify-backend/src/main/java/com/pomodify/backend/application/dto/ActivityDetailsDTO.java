package com.pomodify.backend.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
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
    private LocalDateTime scheduledStartTime;
    private LocalDateTime scheduledAt;
    private Long categoryId;
    private String categoryName;
    private List<SessionDTO> sessions;
    private Integer totalFocusTime;
    private Integer totalBreakTime;
    private Integer totalDurationMinutes;
}