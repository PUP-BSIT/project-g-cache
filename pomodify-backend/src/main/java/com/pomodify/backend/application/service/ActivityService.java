package com.pomodify.backend.application.service;

import com.pomodify.backend.application.command.activity.CreateActivityCommand;
import com.pomodify.backend.application.command.activity.GetAllActivityCommand;
import com.pomodify.backend.application.command.activity.UpdateActivityCommand;
import com.pomodify.backend.application.result.ActivityResult;
import com.pomodify.backend.domain.model.Activity;
import com.pomodify.backend.domain.model.Category;
import com.pomodify.backend.domain.model.User;
import com.pomodify.backend.infrastructure.repository.impl.ActivityRepositoryAdapter;
import com.pomodify.backend.infrastructure.repository.impl.CategoryRepositoryAdapter;
import com.pomodify.backend.infrastructure.repository.impl.UserRepositoryJpaAdapter;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ActivityService {
    private final ActivityRepositoryAdapter activityRepository;
    private final CategoryRepositoryAdapter categoryRepository;
    private final UserRepositoryJpaAdapter userRepository;

    @Transactional
    public Optional<ActivityResult> createActivity(CreateActivityCommand command) {
        User user = userRepository.findUser(command.userId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Optional<Category> category = categoryRepository.findCategory(command.categoryId());

        Activity activity = Activity.create(
                command.title(),
                command.description(),
                user,
                category.orElse(null)
        );
        Activity saved =  activityRepository.save(activity);

        return Optional.of(mapToResult(saved));
    }

    public Page<ActivityResult> getAllActivities(GetAllActivityCommand command) {
        Page<Activity> activitiesPage = activityRepository.findAllDynamic(
                command.userId(),
                command.deleted(),
                command.categoryId(),
                command.pageable()
        );

        return activitiesPage.map(this::mapToResult);
    }

    public ActivityResult updateActivity(UpdateActivityCommand command) {
        User user = userRepository.findUser(command.activityOwnerId())
                .orElseThrow(() -> new IllegalArgumentException("Unauthorized user"));

        Optional<Activity> activityOpt= activityRepository.findNotDeletedActivity(command.activityId(), command.activityOwnerId());
        if (activityOpt.isEmpty()) {
            throw new IllegalArgumentException("Activity not found");
        }

        Category changeCategory = null;

        if (command.changeCategoryIdTo() != null) {
            Optional<Category> categoryOpt = categoryRepository.findCategory(command.changeCategoryIdTo());
            if (categoryOpt.isEmpty()) {
                throw new IllegalArgumentException("Category not found");
            }
            changeCategory = categoryOpt.get();
        }

        Activity activityToUpdate = activityOpt.get();
        String changeActivityTitle = command.changeActivityTitleTo();
        String changeActivityDescription = command.changeActivityDescriptionTo();

        activityToUpdate.updateDetails(
                changeActivityTitle,
                changeActivityDescription,
                changeCategory
        );

        Activity updatedActivity = activityRepository.save(activityToUpdate);
        return mapToResult(updatedActivity);
    }

    private ActivityResult mapToResult(Activity activity) {
        return ActivityResult.builder()
                .activityId(activity.getId())
                .categoryId(activity.getCategory() != null ? activity.getCategory().getId() : null)
                .activityTitle(activity.getTitle())
                .activityDescription(activity.getDescription())
                .build();
    }
}
