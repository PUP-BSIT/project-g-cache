package com.pomodify.backend.infrastructure.repository.impl;

import com.pomodify.backend.domain.model.Activity;
import com.pomodify.backend.domain.repository.ActivityRepository;
import com.pomodify.backend.domain.specification.ActivitySpecification;
import com.pomodify.backend.infrastructure.repository.spring.SpringActivityJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class ActivityRepositoryAdapter implements ActivityRepository {

    private final SpringActivityJpaRepository springRepo;

    @Override
    public Activity save(Activity activity) {
        return springRepo.save(activity);
    }

    @Override
    public Optional<Activity> findById(Long id) {
        return springRepo.findById(id);
    }

    @Override
    public Optional<Activity> findActivity(Long id, Long userId) {
        return springRepo.findByIdAndUserId(id, userId);
    }

    @Override
    public Page<Activity> findAllDynamic(Long userId, Boolean deleted, Long categoryId, Pageable pageable) {
        Specification<Activity> spec =
                ActivitySpecification.belongsToUser(userId)
                        .and(ActivitySpecification.isDeleted(deleted))
                        .and(ActivitySpecification.inCategory(categoryId));

        return springRepo.findAll(spec, pageable);
    }

    @Override
    public Long countActivities(Long userId, Boolean deleted, Long categoryId) {
        Specification<Activity> spec =
                ActivitySpecification.belongsToUser(userId)
                        .and(ActivitySpecification.isDeleted(deleted))
                        .and(ActivitySpecification.inCategory(categoryId));

        return springRepo.count(spec);
    }

    @Override
    public Optional<Activity> findByIdAndUserId(Long id, Long userId) {
        return springRepo.findByIdAndUserId(id, userId);
    }

    @Override
    public void deleteAllByUserId(Long userId) {
        springRepo.deleteAllByUserId(userId);
    }
}
