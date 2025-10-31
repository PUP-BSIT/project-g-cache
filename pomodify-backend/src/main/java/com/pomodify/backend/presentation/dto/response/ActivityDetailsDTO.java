package com.pomodify.backend.presentation.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ActivityDetailsDTO {
    private Long id;
    private String name;
    private String description;
    private String status;
    private Long categoryId;
}