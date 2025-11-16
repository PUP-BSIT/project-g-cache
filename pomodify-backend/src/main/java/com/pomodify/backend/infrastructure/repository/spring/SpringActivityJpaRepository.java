package com.pomodify.backend.infrastructure.repository.spring;

import com.pomodify.backend.domain.model.Activity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SpringActivityJpaRepository extends JpaRepository<Activity, Long> {
    List<Activity> findByUserIdAndIsActiveFalse(Long userId);
    
    List<Activity> findByCategoryIdAndUserIdAndIsActiveFalse(Long categoryId, Long userId);
}