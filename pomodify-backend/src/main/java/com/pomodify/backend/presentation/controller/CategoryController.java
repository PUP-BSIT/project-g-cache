package com.pomodify.backend.presentation.controller;

import com.pomodify.backend.application.command.category.CreateCategoryCommand;
import com.pomodify.backend.application.command.category.DeleteCategoryCommand;
import com.pomodify.backend.application.command.category.GetAllCategoryCommand;
import com.pomodify.backend.application.command.category.UpdateCategoryCommand;
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
import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/api/v1/category")
@Slf4j
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    // ──────────────── Create ────────────────
    @PostMapping("/create-category")
    public ResponseEntity<CategoryResponse> createCategory(
            @RequestBody @Valid CategoryRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        Long userId = jwt.getClaim("userId");

        log.info("Create category request received: {}", request.categoryName());

        CreateCategoryCommand command = CreateCategoryCommand.builder()
                .name(request.categoryName())
                .userId(userId)
                .build();

        CategoryItem item = CategoryMapper.toCategoryItem(
                categoryService.createCategory(command).orElse(null));

        String message = item.categoryId() == null
                ? "Failed to create category"
                : "Category created successfully";

        CategoryResponse response = CategoryMapper.toCategoryResponse(item, message);

        log.info("{}: {}", message, item.categoryName());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ──────────────── Update ────────────────
    @PutMapping("/update/{id}")
    public ResponseEntity<CategoryResponse> updateCategory(
            @PathVariable Long id,
            @RequestBody @Valid UpdateCategoryRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        Long userId = jwt.getClaim("userId");
        log.info("Update category request received for category id: {} by userId: {}", id, userId);

        UpdateCategoryCommand command = UpdateCategoryCommand.builder()
                .categoryId(id)
                .newCategoryName(request.newCategoryName())
                .userId(userId)
                .build();

        CategoryItem item = CategoryMapper.toCategoryItem(
                categoryService.updateCategory(command).orElse(null));

        String message = item.categoryId() == null
                ? "Failed to update category"
                : "Category updated successfully";

        CategoryResponse response = CategoryMapper.toCategoryResponse(item, message);

        log.info("{}: {}", message, item.categoryName());
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }


    // ──────────────── Delete ────────────────
    @DeleteMapping("/{id}")
    public ResponseEntity<CategoryResponse> deleteCategory(
            @PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {

        Long userId = jwt.getClaim("userId");
        log.info("Delete request received for category id:{} by userId: {}", id, userId);

        DeleteCategoryCommand command = DeleteCategoryCommand.builder()
                .categoryId(id)
                .userId(userId)
                .build();

        CategoryItem item = CategoryMapper.toCategoryItem(categoryService.deleteCategory(command));

        String message = item == null
                ? "Failed to delete category"
                : "Category deleted successfully";

        if (item == null) {
            log.error("Failed to delete category with id: {}", id);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
                    CategoryMapper.toCategoryResponse(Collections.emptyList(), message)
            );
        }

        CategoryResponse response = CategoryMapper.toCategoryResponse(item, message);

        log.info("Category deleted successfully: {}", item.categoryName());
        return ResponseEntity.ok(response);
    }

    // ──────────────── List All ────────────────
    @GetMapping("/all")
    public ResponseEntity<CategoryResponse> getAllCategories(@AuthenticationPrincipal Jwt jwt) {
        Long userId = jwt.getClaim("userId");
        log.info("Get all categories request received from userId: {}", userId);

        GetAllCategoryCommand command = GetAllCategoryCommand.builder()
                .userId(userId)
                .build();

        List<CategoryItem> items = categoryService.getAllCategories(command)
                        .stream()
                        .map(CategoryMapper::toCategoryItem)
                        .toList();

        String message = items.isEmpty()
                ? "No categories found"
                : (" Categories retrieved successfully: " + items.size());

        CategoryResponse response = CategoryMapper.toCategoryResponse(items, message);

        log.info(message);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/all-deleted")
    public ResponseEntity<CategoryResponse> getAllDeletedCategories(@AuthenticationPrincipal Jwt jwt) {
        Long userId = jwt.getClaim("userId");
        log.info("Get all deleted categories request received from userId: {}", userId);

        GetAllCategoryCommand command = GetAllCategoryCommand.builder()
                .userId(userId)
                .build();

        List<CategoryItem> items = categoryService.getAllDeletedCategories(command)
                .stream()
                .map(CategoryMapper::toCategoryItem)
                .toList();

        String message = items.isEmpty()
                ? "No deleted categories found"
                : ("Deleted categories retrieved successfully: " + items.size());

        log.info(message);
        return ResponseEntity.ok(
                CategoryMapper.toCategoryResponse(items, message)
        );
    }
}
