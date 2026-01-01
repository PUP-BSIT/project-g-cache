package com.pomodify.backend.application.service;

import com.pomodify.backend.application.command.activity.*;
import com.pomodify.backend.application.helper.DomainHelper;
import com.pomodify.backend.application.helper.UserHelper;
import com.pomodify.backend.application.result.ActivityResult;
import com.pomodify.backend.domain.model.Activity;
import com.pomodify.backend.domain.model.Category;
import com.pomodify.backend.domain.model.User;
import com.pomodify.backend.domain.repository.ActivityRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class ActivityService {

    private final ActivityRepository activityRepository;
    private final UserHelper userHelper;
    private final DomainHelper domainHelper;

    /* -------------------- CREATE -------------------- */
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "activities", allEntries = true),
            @CacheEvict(value = "categories", allEntries = true)
    })
    public ActivityResult createActivity(CreateActivityCommand command) {
        User user = userHelper.getUserOrThrow(command.user());
        Category category = domainHelper
                .getCategoryOrNull(
                        command.categoryId(),
                        command.user());

        log.info("Creating activity for user ID: {}{}", user.getId(),
                category != null ? " with category ID: " + category.getId() : "");

        Activity saved = activityRepository.save(
                user.createActivity(
                        command.createActivityTitle(),
                        command.createDescription(),
                        category)
        );

        log.info("Activity created with ID: {}", saved.getId());
        return mapToResult(saved);
    }

    /* -------------------- GET -------------------- */
    @Transactional
    @Cacheable(
            value = "activities",
            key = "{ #command.user(), #command.deleted(), #command.categoryId(), "
                    + "#command.pageable().pageNumber, #command.pageable().pageSize, "
                    + "#command.sortBy(), #command.sortOrder() }"
    )
    public Page<ActivityResult> getActivities(GetAllActivityCommand command) {
        Page<Activity> activitiesPage = activityRepository.findAllDynamic(
                command.user(), command.deleted(), command.categoryId(), command.pageable()
        );

        log.info(activitiesPage.isEmpty()
                ? "No activities found for user ID: " + command.user()
                : "Found " + activitiesPage.getTotalElements()
                        + " activities for user ID: "
                        + command.user());

        return activitiesPage.map(this::mapToResult);
    }

    @Cacheable(value = "activity", key = "{ #command.activityId(), #command.user() }")
    public ActivityResult getActivity(GetActivityCommand command) {
        Activity activity = domainHelper.getActivityOrThrow(command.activityId(), command.user());

        log.info("Activity retrieved with ID: {} for user ID: {}", activity.getId(), command.user());
        return mapToResult(activity);
    }

    /* -------------------- UPDATE -------------------- */
    @Transactional
    @Caching(
            evict = {
                    @CacheEvict(value = "activity", key = "{#command.user(), #command.activityId()}"),
                    @CacheEvict(value = "activities", allEntries = true),
                    @CacheEvict(value = "categories", allEntries = true)
            }
    )
    public ActivityResult updateActivity(UpdateActivityCommand command) {
        User user = userHelper.getUserOrThrow(command.user());
        Activity activity = domainHelper.getActivityOrThrow(command.activityId(), command.user());

        if (activity.isDeleted()) {
            throw new IllegalArgumentException("Cannot update a deleted activity");
        }

        Category changeCategory = domainHelper
                .getCategoryOrNull(
                        command.changeCategoryIdTo(),
                        command.user());

        Activity updated = activityRepository.save(
                user.updateActivity(
                        activity,
                        command.changeActivityTitleTo(),
                        command.changeActivityDescriptionTo(),
                        changeCategory
                )
        );

        log.info("Activity updated with ID: {}", updated.getId());
        return mapToResult(updated);
    }

    /* -------------------- DELETE -------------------- */
    @Transactional
    @Caching(
            evict = {
                    @CacheEvict(value = "activity", key = "{#command.user(), #command.activityId()}"),
                    @CacheEvict(value = "activities", allEntries = true),
                    @CacheEvict(value = "categories", allEntries = true)
            }
    )
    public ActivityResult deleteActivity(DeleteActivityCommand command) {
        User user = userHelper.getUserOrThrow(command.user());
        Activity activity = domainHelper.getActivityOrThrow(command.activityId(), command.user());

        if (activity.isDeleted()) {
            throw new IllegalArgumentException("Activity is already deleted");
        }

        Activity deleted = activityRepository.save(user.deleteActivity(activity));
        log.info("Activity soft-deleted with ID: {}", deleted.getId());

        return mapToResult(deleted);
    }

    /* -------------------- HELPERS -------------------- */
    private ActivityResult mapToResult(Activity activity) {
        return ActivityResult.builder()
                .activityId(activity.getId())
                .categoryId(activity.getCategory() != null ? activity.getCategory().getId() : null)
                .categoryName(activity.getCategory() != null ? activity.getCategory().getName() : null)
                .activityTitle(activity.getTitle())
                .activityDescription(activity.getDescription())
                .createdAt(activity.getCreatedAt())
                .updatedAt(activity.getUpdatedAt())
                .build();
    }
}
