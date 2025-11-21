package com.pomodify.backend.infrastructure.repository.impl;

import com.pomodify.backend.domain.model.Activity;
import com.pomodify.backend.domain.repository.ActivityRepository;
import com.pomodify.backend.domain.specification.ActivitySpecification;
import com.pomodify.backend.infrastructure.repository.spring.SpringActivityJpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public class ActivityRepositoryAdapter implements ActivityRepository {
    private final SpringActivityJpaRepository springRepo;

    public ActivityRepositoryAdapter(SpringActivityJpaRepository springRepo) {
        this.springRepo = springRepo;
    }

    /**
     * @param activity
     * @return
     */
    @Override
    public Activity save(Activity activity) {
        return springRepo.save(activity);
    }

    /**
     * @param id 
     * @return
     */
    @Override
    public Optional<Activity> findNotDeletedActivity(Long id) {
        return springRepo.findByIdAndIsDeletedFalse(id);
    }

    /**
     * @param id 
     * @return
     */
    @Override
    public Optional<Activity> findDeletedActivity(Long id) {
        return springRepo.findByIdAndIsDeletedTrue(id);
    }

    /**
     * @param userId 
     * @param deleted
     * @param categoryId
     * @param pageable
     * @return
     */
    @Override
    public Page<Activity> findAllDynamic(Long userId, Boolean deleted, Long categoryId, Pageable pageable) {
        Specification<Activity> spec =
                ActivitySpecification.belongsToUser(userId)
                .and(ActivitySpecification.isDeleted(deleted))
                .and(ActivitySpecification.inCategory(categoryId));

        return springRepo.findAll(spec, pageable);
    }
}
