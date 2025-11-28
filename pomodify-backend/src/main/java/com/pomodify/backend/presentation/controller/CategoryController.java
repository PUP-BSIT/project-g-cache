package com.pomodify.backend.presentation.controller;

import com.pomodify.backend.application.command.category.*;
import com.pomodify.backend.application.result.CategoryResult;
import com.pomodify.backend.application.service.CategoryService;
import com.pomodify.backend.presentation.dto.request.category.CategoryRequest;
import com.pomodify.backend.presentation.dto.request.category.UpdateCategoryRequest;
import com.pomodify.backend.presentation.dto.item.CategoryItem;
import com.pomodify.backend.presentation.dto.response.CategoryResponse;
import com.pomodify.backend.presentation.mapper.CategoryMapper;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/categories")
@Slf4j
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @PostMapping
    public ResponseEntity<CategoryResponse> createCategory(@RequestBody @Valid CategoryRequest request,
                                                           @AuthenticationPrincipal Jwt jwt) {
        Long userId = jwt.getClaim("user");
        log.info("Create category request: {}", request.categoryName());

        CategoryResult result = categoryService.createCategory(
                CreateCategoryCommand.builder()
                        .user(userId)
                        .createCategory(request.categoryName())
                        .build()
        );

        CategoryItem item = CategoryMapper.toCategoryItem(result);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(CategoryMapper.toCategoryResponse(item, "Category created successfully"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CategoryResponse> updateCategory(@PathVariable Long id,
                                                           @RequestBody @Valid UpdateCategoryRequest request,
                                                           @AuthenticationPrincipal Jwt jwt) {
        Long userId = jwt.getClaim("user");

        CategoryResult result = categoryService.updateCategory(
                UpdateCategoryCommand.builder()
                        .categoryId(id)
                        .changeCategoryName(request.newCategoryName())
                        .user(userId)
                        .build()
        );

        CategoryItem item = CategoryMapper.toCategoryItem(result);
        return ResponseEntity.ok(CategoryMapper.toCategoryResponse(item, "Category updated successfully"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<CategoryResponse> deleteCategory(@PathVariable Long id,
                                                           @AuthenticationPrincipal Jwt jwt) {
        Long userId = jwt.getClaim("user");

        CategoryResult result = categoryService.deleteCategory(
                DeleteCategoryCommand.builder()
                        .categoryId(id)
                        .user(userId)
                        .build()
        );

        CategoryItem item = CategoryMapper.toCategoryItem(result);
        return ResponseEntity.ok(CategoryMapper.toCategoryResponse(item, "Category deleted successfully"));
    }

    @GetMapping
    public ResponseEntity<CategoryResponse> getAllCategories(@AuthenticationPrincipal Jwt jwt) {
        Long userId = jwt.getClaim("user");

        List<CategoryResult> results = categoryService.getAllCategories(
                GetAllCategoryCommand.builder()
                        .user(userId)
                        .build()
        );

        List<CategoryItem> items = results.stream()
                .map(CategoryMapper::toCategoryItem)
                .toList();

        String message = items.isEmpty()
                ? "No categories found"
                : "Categories retrieved successfully: " + items.size();

        return ResponseEntity.ok(CategoryMapper.toCategoryResponse(items, message));
    }
}
