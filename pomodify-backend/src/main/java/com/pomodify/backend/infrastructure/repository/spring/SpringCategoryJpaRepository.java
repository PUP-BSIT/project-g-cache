package com.pomodify.backend.infrastructure.repository.spring;

import com.pomodify.backend.domain.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SpringCategoryJpaRepository extends JpaRepository<Category, Long> {
    List<Category> findByUserId(Long userId);
    
    @Query("SELECT c FROM Category c WHERE c.user.id = :userId AND c.isDeleted = false")
    List<Category> findActiveByUserId(@Param("userId") Long userId);
    
    boolean existsByIdAndUserId(Long id, Long userId);
}