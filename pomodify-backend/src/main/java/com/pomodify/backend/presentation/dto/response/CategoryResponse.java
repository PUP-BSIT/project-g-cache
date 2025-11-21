package com.pomodify.backend.presentation.dto.response;

import com.pomodify.backend.presentation.dto.item.CategoryItem;
import lombok.Builder;
import java.util.List;

@Builder
public record CategoryResponse(String message, List<CategoryItem> categories) {
}
