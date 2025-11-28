package com.pomodify.backend.infrastructure.repository.spring;

import com.pomodify.backend.domain.model.Activity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.Optional;

public interface SpringActivityJpaRepository extends JpaRepository<Activity, Long>, JpaSpecificationExecutor<Activity> {
    Optional<Activity> findByIdAndUserId(Long id, Long userId);
}