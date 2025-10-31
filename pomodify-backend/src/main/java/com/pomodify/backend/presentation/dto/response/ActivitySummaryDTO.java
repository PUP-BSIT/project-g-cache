package com.pomodify.backend.presentation.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ActivitySummaryDTO {
    private Long id;
    private String name;
    private String status;
}