package com.pomodify.backend.presentation.dto.response;

import lombok.Builder;

@Builder
public record CategoryItem(Long categoryId, String categoryName) {
}