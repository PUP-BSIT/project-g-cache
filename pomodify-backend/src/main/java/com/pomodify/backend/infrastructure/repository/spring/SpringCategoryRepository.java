package com.pomodify.backend.infrastructure.repository.spring;

import com.pomodify.backend.domain.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SpringCategoryRepository extends JpaRepository<Category, Long> {
}
