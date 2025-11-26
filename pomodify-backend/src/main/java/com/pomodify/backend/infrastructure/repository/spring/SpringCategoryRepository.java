package com.pomodify.backend.infrastructure.repository.spring;

import com.pomodify.backend.domain.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SpringCategoryRepository extends JpaRepository<Category, Long> {
    Optional<Category> findByIdAndUserIdAndIsDeletedFalse(Long id, Long userId);
    List<Category> findAllByUserIdAndIsDeletedFalse(Long userId);
}
