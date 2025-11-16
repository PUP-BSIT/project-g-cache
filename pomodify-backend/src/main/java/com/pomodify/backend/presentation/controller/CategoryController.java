package com.pomodify.backend.presentation.controller;

import com.pomodify.backend.application.command.category.CreateCategoryCommand;
import com.pomodify.backend.application.command.category.UpdateCategoryCommand;
import com.pomodify.backend.application.command.category.DeleteCategoryCommand;
import com.pomodify.backend.application.result.CategoryResult;
import com.pomodify.backend.application.service.CategoryService;
import com.pomodify.backend.presentation.dto.request.CategoryRequest;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
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

    // ──────────────── Create ────────────────
    @PostMapping
    public ResponseEntity<CategoryResult> createCategory(
            @RequestBody @Valid CategoryRequest request,
            Authentication authentication) {

        log.info("Create category request received: {}", request.name());

        Long userId = (Long) authentication.getPrincipal();

        CreateCategoryCommand command = CreateCategoryCommand.builder()
                .name(request.name())
                .userId(userId)
                .build();

        CategoryResult result = categoryService.createCategory(command);

        log.info("Category created successfully: {}", result.name());
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    // ──────────────── Update ────────────────
    @PutMapping("/{id}")
    public ResponseEntity<CategoryResult> updateCategory(
            @PathVariable Long id,
            @RequestBody @Valid CategoryRequest request) {

        log.info("Update category request received for id: {}", id);

        UpdateCategoryCommand command = UpdateCategoryCommand.builder()
                .categoryId(id)
                .newName(request.name())
                .build();

        CategoryResult result = categoryService.updateCategory(command);

        log.info("Category updated successfully: {}", result.name());
        return ResponseEntity.ok(result);
    }

    // ──────────────── Delete ────────────────
    @DeleteMapping("/{id}")
    public ResponseEntity<CategoryResult> deleteCategory(@PathVariable Long id) {

        log.info("Delete category request received for id: {}", id);

        DeleteCategoryCommand command = new DeleteCategoryCommand(id);
        CategoryResult result = categoryService.deleteCategory(command);

        log.info("Category deleted successfully: {}", result.name());
        return ResponseEntity.ok(result);
    }

    // ──────────────── List All ────────────────
    @GetMapping
    public ResponseEntity<List<CategoryResult>> getAllCategories() {

        log.info("Get all categories request received");

        List<CategoryResult> results = categoryService.getAllCategories();

        log.info("Retrieved {} categories", results.size());
        return ResponseEntity.ok(results);
    }
}
