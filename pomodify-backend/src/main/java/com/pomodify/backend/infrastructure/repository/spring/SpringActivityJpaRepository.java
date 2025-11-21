package com.pomodify.backend.infrastructure.repository.spring;

import com.pomodify.backend.domain.model.Activity;
import com.pomodify.backend.domain.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface SpringActivityJpaRepository extends JpaRepository<Activity, Long>, JpaSpecificationExecutor<Activity> {

    Optional<Activity> findByIdAndUserIdAndIsDeletedFalse(Long id, Long userId);
    Optional<Activity> findByIdAndUserIdAndIsDeletedTrue(Long id, Long userId);

    List<Activity> user(User user);
}