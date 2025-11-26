package com.pomodify.backend.presentation.mapper;

import com.pomodify.backend.application.result.CategoryResult;
import com.pomodify.backend.presentation.dto.item.CategoryItem;
import com.pomodify.backend.presentation.dto.response.CategoryResponse;

import java.util.Collections;
import java.util.List;

public class CategoryMapper {

    private CategoryMapper() {} // prevent instantiation

    // ─── Convert domain result → presentation item ───
    public static CategoryItem toCategoryItem(CategoryResult result) {
        if (result == null) return null;

        return CategoryItem.builder()
                .categoryId(result.categoryId())
                .categoryName(result.categoryName())
                .activitiesCount(result.activitiesCount())
                .build();
    }

    // ─── Convert a single presentation item → response ───
    public static CategoryResponse toCategoryResponse(CategoryItem item, String message) {
        return CategoryResponse.builder()
                .categories(item != null ? Collections.singletonList(item) : Collections.emptyList())
                .message(message)
                .build();
    }

    // ─── Convert multiple presentation items → response ───
    public static CategoryResponse toCategoryResponse(List<CategoryItem> items, String message) {
        return CategoryResponse.builder()
                .categories(items != null ? items : Collections.emptyList())
                .message(message)
                .build();
    }
}
