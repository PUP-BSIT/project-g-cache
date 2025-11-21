package com.pomodify.backend.presentation.dto.response;

import lombok.Builder;
import java.util.List;

@Builder
public record CategoryResponse(String message, List<CategoryItem> categories) {
}
