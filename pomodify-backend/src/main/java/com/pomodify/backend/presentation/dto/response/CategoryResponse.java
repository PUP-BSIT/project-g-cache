package com.pomodify.backend.presentation.dto.response;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class CategoryResponse {
    private Long id;
    private String name;
}