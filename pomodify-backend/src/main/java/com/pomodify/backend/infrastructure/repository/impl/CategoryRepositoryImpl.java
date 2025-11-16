package com.pomodify.backend.infrastructure.repository.impl;

import com.pomodify.backend.domain.model.Category;
import com.pomodify.backend.domain.repository.CategoryRepository;
import com.pomodify.backend.infrastructure.repository.spring.SpringCategoryRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class CategoryRepositoryImpl implements CategoryRepository {

    private final SpringCategoryRepository springRepo;

    public CategoryRepositoryImpl(SpringCategoryRepository springRepo) {
        this.springRepo = springRepo;
    }

    @Override
    public Category save(Category category) {
        return springRepo.save(category);
    }

    @Override
    public Optional<Category> findById(Long id) {
        return springRepo.findById(id);
    }

    @Override
    public List<Category> findAll() {
        return springRepo.findAll();
    }

}
