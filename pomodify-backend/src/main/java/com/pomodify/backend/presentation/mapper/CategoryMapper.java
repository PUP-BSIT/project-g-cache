package com.pomodify.backend.presentation.mapper;

import com.pomodify.backend.application.result.CategoryResult;
import com.pomodify.backend.presentation.dto.response.CategoryItem;
import com.pomodify.backend.presentation.dto.response.CategoryResponse;

import java.util.Collections;
import java.util.List;

public class CategoryMapper {
    private CategoryMapper() {} // prevent instantiation

    // Single item -> CategoryItem
    public static CategoryItem toCategoryItem(CategoryResult result) {
        if (result == null) return CategoryItem.builder().build();

        return CategoryItem.builder()
                .categoryId(result.categoryId())
                .categoryName(result.categoryName())
                .build();
    }

    // Wrap a single item
    public static CategoryResponse toCategoryResponse(CategoryItem item, String message) {

        return CategoryResponse.builder()
                .categories(Collections.singletonList(item))
                .message(message)
                .build();
    }

    // Wrap multiple items
    public static CategoryResponse toCategoryResponse(List<CategoryItem> items, String message) {
        return CategoryResponse.builder()
                .message(items.isEmpty() ? "No categories found" : message)
                .categories(items)
                .build();
    }
}

