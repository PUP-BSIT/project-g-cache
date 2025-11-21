package com.pomodify.backend.presentation.dto.item;

import lombok.Builder;

@Builder
public record CategoryItem(Long categoryId, String categoryName) {
}