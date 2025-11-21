package com.pomodify.backend.infrastructure.repository.impl;

import com.pomodify.backend.domain.model.Category;
import com.pomodify.backend.domain.repository.CategoryRepository;
import com.pomodify.backend.infrastructure.repository.spring.SpringCategoryRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class CategoryRepositoryAdapter implements CategoryRepository {

    private final SpringCategoryRepository springRepo;

    public CategoryRepositoryAdapter(SpringCategoryRepository springRepo) {
        this.springRepo = springRepo;
    }

    @Override
    public Category save(Category category) {
        return springRepo.save(category);
    }

    @Override
    public Optional<Category> findCategory(Long id) {
        return springRepo.findByIdAndIsNotDeleted(id, true);
    }

    @Override
    public List<Category> findAllNotDeleted(Long userId) {
        return springRepo.findByUserIdAndIsNotDeleted(userId, true);
    }

    @Override
    public  List<Category> findAllDeleted(Long userId) {
        return springRepo.findByUserIdAndIsNotDeleted(userId, false);
    }

}
