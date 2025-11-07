package com.pomodify.backend.presentation.controllers;

import com.pomodify.backend.application.commands.CreateCategoryCommand;
import com.pomodify.backend.application.commands.handlers.CreateCategoryHandler;
import com.pomodify.backend.application.services.ActivityQueryService;
import com.pomodify.backend.domain.model.Category;
import com.pomodify.backend.domain.repository.CategoryRepository;
import com.pomodify.backend.presentation.dto.request.CreateCategoryRequest;
import com.pomodify.backend.presentation.dto.response.CategoryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/categories")
@RequiredArgsConstructor
public class CategoryController {
    private final CreateCategoryHandler createCategoryHandler;
    private final CategoryRepository categoryRepository;
    private final ActivityQueryService activityQueryService;

    @PostMapping
    public ResponseEntity<CategoryResponse> createCategory(@RequestBody CreateCategoryRequest request) {
        Long categoryId = createCategoryHandler.handle(CreateCategoryCommand.builder()
                .userId(request.getUserId())
                .name(request.getName())
                .build());

        return categoryRepository.findById(categoryId)
                .map(this::toCategoryResponse)
                .map(ResponseEntity::ok)
                .orElseThrow();
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<CategoryResponse>> getUserCategories(@PathVariable Long userId) {
        List<CategoryResponse> categories = categoryRepository.findActiveByUserId(userId)
                .stream()
                .map(this::toCategoryResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(categories);
    }

    @DeleteMapping("/{categoryId}")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long categoryId) {
        categoryRepository.delete(categoryId);
        return ResponseEntity.ok().build();
    }

    private CategoryResponse toCategoryResponse(Category category) {
        return CategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .activities(category.getActiveActivities().stream()
                        .map(activity -> activityQueryService.getActivityDetails(activity.getId()))
                        .collect(Collectors.toList()))
                .build();
    }
}