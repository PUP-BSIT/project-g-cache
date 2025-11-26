package com.pomodify.backend.application.service;

import com.pomodify.backend.application.command.category.*;
import com.pomodify.backend.application.helper.DomainHelper;
import com.pomodify.backend.application.helper.UserHelper;
import com.pomodify.backend.application.result.CategoryResult;
import com.pomodify.backend.domain.model.Category;
import com.pomodify.backend.domain.model.User;
import com.pomodify.backend.domain.repository.ActivityRepository;
import com.pomodify.backend.domain.repository.CategoryRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final ActivityRepository activityRepository;
    private final UserHelper userHelper;
    private final DomainHelper domainHelper;

    /* -------------------- CREATE -------------------- */
    @Transactional
    @CacheEvict(value = "categories", allEntries = true)
    public CategoryResult createCategory(CreateCategoryCommand command) {
        User user = userHelper.getUserOrThrow(command.user());
        Category saved = categoryRepository.save(user.createCategory(command.createCategory()));
        log.info("Category created with ID: {}", saved.getId());
        return mapToResult(saved, command.user());
    }

    /* -------------------- UPDATE -------------------- */
    @Transactional
    @CacheEvict(value = "categories", allEntries = true)
    public CategoryResult updateCategory(UpdateCategoryCommand command) {
        User user = userHelper.getUserOrThrow(command.user());
        Category category = domainHelper.getCategoryOrThrow(command.categoryId(), command.user());

        user.changeCategoryName(command.changeCategoryName(), category);
        Category updated = categoryRepository.save(category);
        log.info("Category updated with ID: {}", updated.getId());
        return mapToResult(updated, command.user());
    }

    /* -------------------- DELETE -------------------- */
    @Transactional
    @CacheEvict(value = "categories", allEntries = true)
    public CategoryResult deleteCategory(DeleteCategoryCommand command) {
        User user = userHelper.getUserOrThrow(command.user());
        Category category = domainHelper.getCategoryOrThrow(command.categoryId(), command.user());

        if (category.isDeleted()) {
            throw new IllegalArgumentException("Category is already deleted");
        }

        Category deleted = categoryRepository.save(user.deleteCategory(category));
        log.info("Category soft-deleted with ID: {}", deleted.getId());
        return mapToResult(deleted, command.user());
    }

    /* -------------------- GET ALL -------------------- */
    @Cacheable(value = "categories", key = "#command.user")
    public List<CategoryResult> getAllCategories(GetAllCategoryCommand command) {
        List<Category> categories = categoryRepository.findAllCategories(command.user());
        return categories.stream()
                .map(cat -> mapToResult(cat, command.user()))
                .toList();
    }

    /* -------------------- HELPERS -------------------- */
    private CategoryResult mapToResult(Category category, Long userId) {
        long activitiesCount = activityRepository.countActivities(userId, false, category.getId());
        return CategoryResult.builder()
                .categoryId(category.getId())
                .categoryName(category.getName())
                .activitiesCount(activitiesCount)
                .build();
    }
}
