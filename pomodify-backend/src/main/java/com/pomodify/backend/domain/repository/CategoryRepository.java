package com.pomodify.backend.domain.repository;

import com.pomodify.backend.domain.model.Category;
import java.util.List;
import java.util.Optional;

public interface CategoryRepository {
    Optional<Category> findById(Long id);
    List<Category> findByUserId(Long userId);
    void save(Category category);
    void delete(Long id);
    boolean existsByIdAndUserId(Long id, Long userId);
}