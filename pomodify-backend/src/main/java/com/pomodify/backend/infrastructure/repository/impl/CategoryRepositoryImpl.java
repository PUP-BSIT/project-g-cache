package com.pomodify.backend.infrastructure.repository.impl;

import com.pomodify.backend.domain.model.Category;
import com.pomodify.backend.domain.repository.CategoryRepository;
import com.pomodify.backend.infrastructure.repository.spring.SpringCategoryJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class CategoryRepositoryImpl implements CategoryRepository {
    private final SpringCategoryJpaRepository springCategoryJpaRepository;

    @Override
    public Optional<Category> findById(Long id) {
        return springCategoryJpaRepository.findById(id);
    }

    @Override
    public List<Category> findByUserId(Long userId) {
        return springCategoryJpaRepository.findByUserId(userId);
    }

    @Override
    public List<Category> findActiveByUserId(Long userId) {
        return springCategoryJpaRepository.findActiveByUserId(userId);
    }

    @Override
    public void save(Category category) {
        springCategoryJpaRepository.save(category);
    }

    @Override
    public void delete(Long id) {
        springCategoryJpaRepository.findById(id).ifPresent(category -> {
            category.delete();
            springCategoryJpaRepository.save(category);
        });
    }

    @Override
    public boolean existsByIdAndUserId(Long id, Long userId) {
        return springCategoryJpaRepository.existsByIdAndUserId(id, userId);
    }
}