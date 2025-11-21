package com.pomodify.backend.application.service;

import com.pomodify.backend.application.command.category.CreateCategoryCommand;
import com.pomodify.backend.application.command.category.DeleteCategoryCommand;
import com.pomodify.backend.application.command.category.GetAllCategoryCommand;
import com.pomodify.backend.application.command.category.UpdateCategoryCommand;
import com.pomodify.backend.application.result.CategoryResult;
import com.pomodify.backend.domain.model.Category;
import com.pomodify.backend.domain.model.User;
import com.pomodify.backend.infrastructure.repository.impl.CategoryRepositoryAdapter;
import com.pomodify.backend.infrastructure.repository.impl.UserRepositoryJpaAdapter;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class CategoryService {

    private final UserRepositoryJpaAdapter userRepository;
    private final CategoryRepositoryAdapter categoryRepository;

    @Transactional
    public Optional<CategoryResult> createCategory(CreateCategoryCommand command) {
        User user = userRepository.findUser(command.userId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Category category = Category.create(command.name(), user);
        Category saved = categoryRepository.save(category);

        return Optional.of(mapToResult(saved));
    }

    @Transactional
    public Optional<CategoryResult> updateCategory(UpdateCategoryCommand command) {
        Optional<Category> categoryOpt = categoryRepository.findCategory(command.categoryId());

        if (categoryOpt.isEmpty()) {
            log.error("Category ID: {} not found or is deleted", command.categoryId());
            return Optional.empty();
        }

        Category category = categoryOpt.get();

        if (!command.userId().equals(category.getUser().getId())) {
            throw new IllegalArgumentException("Unauthorized to update this category");
        }

        category.updateName(command.newCategoryName());
        Category updated = categoryRepository.save(category);

        return Optional.of(mapToResult(updated));
    }

    @Transactional
    public CategoryResult deleteCategory(DeleteCategoryCommand command) {
        Optional<Category> categoryOpt = categoryRepository.findCategory(command.categoryId());

        if (categoryOpt.isEmpty()) {
            log.error("Category ID: {} not found or is already deleted", command.categoryId());
            return null;
        }

        Category category = categoryOpt.get();

        if (!command.userId().equals(category.getUser().getId())) {
            throw new IllegalArgumentException("Unauthorized to delete this category");
        }

        Category deleted = categoryRepository.save(category.delete());

        String message = "Category deleted successfully";

        log.info(message);
        return mapToResult(deleted);
    }

    public List<CategoryResult> getAllCategories(GetAllCategoryCommand command) {
        List<Category> categories = categoryRepository.findAllNotDeleted(command.userId());

        return categories.stream()
                .map(this::mapToResult)
                .toList();
    }

    public List<CategoryResult> getAllDeletedCategories(GetAllCategoryCommand command) {
        List<Category> categories = categoryRepository.findAllDeleted(command.userId());

        return categories.stream()
                .map(this::mapToResult)
                .toList();
    }

    // Mapping domain entity → application result
    private CategoryResult mapToResult(Category category) {
        return CategoryResult.builder()
                .categoryId(category.getId())
                .categoryName(category.getName())
                .active(category.isNotDeleted())
                .activeActivitiesCount(category.getActiveActivities().size())
                .inactiveActivitiesCount(category.getInactiveActivities().size())
                .build();
    }
}