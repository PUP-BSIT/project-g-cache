package com.pomodify.backend.application.commands.handlers;

import com.pomodify.backend.application.commands.UpdateActivityCommand;
import com.pomodify.backend.domain.model.Activity;
import com.pomodify.backend.domain.model.Category;
import com.pomodify.backend.domain.repository.CategoryRepository;
import com.pomodify.backend.infrastructure.repository.spring.SpringActivityJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.pomodify.backend.infrastructure.repository.impl.BaseRepositoryImpl;

@Service
@RequiredArgsConstructor
public class UpdateActivityHandler extends BaseRepositoryImpl {
    private final SpringActivityJpaRepository activityRepository;
    private final CategoryRepository categoryRepository;

    @Transactional
    public void handle(UpdateActivityCommand command) {
        if (command.getActivityId() == null) {
            throw new IllegalArgumentException("Activity ID cannot be null");
        }
        Activity activity = activityRepository.findById(checkNotNull(command.getActivityId()))
                .orElseThrow(() -> new IllegalArgumentException("Activity not found"));

        // Verify ownership
        if (!activity.getUser().getId().equals(command.getUserId())) {
            throw new IllegalArgumentException("Activity does not belong to user");
        }

        // Update basic properties
        activity.setTitle(command.getName());
        activity.setDescription(command.getDescription());

        // Handle category change if needed
        if (command.getCategoryId() != null && !command.getCategoryId().equals(activity.getCategory().getId())) {
            Category newCategory = categoryRepository.findById(command.getCategoryId())
                    .orElseThrow(() -> new IllegalArgumentException("Category not found"));
            
            // Verify new category belongs to same user
            if (!newCategory.getUser().getId().equals(command.getUserId())) {
                throw new IllegalArgumentException("Category does not belong to user");
            }

            // Remove from old category
            activity.getCategory().removeActivity(activity);
            
            // Add to new category
            newCategory.addActivity(activity);
        }

        activityRepository.save(activity);
    }
}