package com.pomodify.backend.application.service;

import com.pomodify.backend.application.command.category.CreateCategoryCommand;
import com.pomodify.backend.application.command.category.UpdateCategoryCommand;
import com.pomodify.backend.application.command.category.DeleteCategoryCommand;
import com.pomodify.backend.application.result.CategoryResult;
import com.pomodify.backend.domain.model.Category;
import com.pomodify.backend.domain.model.User;
import com.pomodify.backend.domain.repository.CategoryRepository;
import com.pomodify.backend.domain.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;

    @Transactional
    public CategoryResult createCategory(CreateCategoryCommand command) {
        User user = userRepository.findById(command.userId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Domain logic: user creates category
        Category category = Category.create(command.name(), user);
        Category saved = categoryRepository.save(category);

        return mapToResult(saved);
    }

    @Transactional
    public CategoryResult updateCategory(UpdateCategoryCommand command) {
        Category category = categoryRepository.findById(command.categoryId())
                .orElseThrow(() -> new IllegalArgumentException("Category not found"));

        // Domain logic: update name
        category.updateName(command.newName());
        Category updated = categoryRepository.save(category);

        return mapToResult(updated);
    }

    @Transactional
    public CategoryResult deleteCategory(DeleteCategoryCommand command) {
        Category category = categoryRepository.findById(command.categoryId())
                .orElseThrow(() -> new IllegalArgumentException("Category not found"));

        // Domain logic: deactivate category (soft delete)
        category.deactivate();
        Category deleted = categoryRepository.save(category);

        return mapToResult(deleted);
    }

    public List<CategoryResult> getAllCategories() {
        List<Category> categories = categoryRepository.findAll();
        return categories.stream()
                .map(this::mapToResult)
                .toList();
    }

    // Mapping domain entity → application result
    private CategoryResult mapToResult(Category category) {
        return new CategoryResult(
                category.getId(),
                category.getName(),
                category.isActive(),
                category.getActiveActivities().size(),
                category.getInactiveActivities().size()
        );
    }

}
