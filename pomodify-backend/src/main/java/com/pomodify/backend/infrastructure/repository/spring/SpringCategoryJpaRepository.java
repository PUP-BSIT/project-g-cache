package com.pomodify.backend.infrastructure.repository.spring;

import com.pomodify.backend.domain.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SpringCategoryJpaRepository extends JpaRepository<Category, Long> {
    List<Category> findByUserId(Long userId);
    
    @Query("SELECT c FROM Category c WHERE c.user.id = :userId AND c.isDeleted = false")
    List<Category> findByUserIdAndDeletedFalse(@Param("userId") Long userId);
    
    @Query("SELECT c FROM Category c WHERE c.id = :id AND c.user.id = :userId AND c.isDeleted = false")
    Optional<Category> findByIdAndUserIdAndDeletedFalse(@Param("id") Long id, @Param("userId") Long userId);
    
    boolean existsByIdAndUserId(Long id, Long userId);
}