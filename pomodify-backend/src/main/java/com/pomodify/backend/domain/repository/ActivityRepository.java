package com.pomodify.backend.domain.repository;

import com.pomodify.backend.domain.model.Activity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;

public interface ActivityRepository {
    Activity save(Activity activity);
    Optional<Activity> findNotDeletedActivity(Long id, Long userId);

    Optional<Activity> findDeletedActivity(Long id, Long userId);

    /** Dynamic, pageable fetching of activities */
    Page<Activity> findAllDynamic(Long userId, Boolean deleted, Long categoryId, Pageable pageable);
}
