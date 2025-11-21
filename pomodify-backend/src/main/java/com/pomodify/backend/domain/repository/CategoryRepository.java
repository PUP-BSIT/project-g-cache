package com.pomodify.backend.domain.repository;

import com.pomodify.backend.domain.model.Category;

import java.util.List;
import java.util.Optional;

public interface CategoryRepository {
    Category save(Category category);
    Optional<Category> findCategory(Long id);
    List<Category> findAllNotDeleted(Long userId);
    List<Category> findAllDeleted(Long userId);
}
