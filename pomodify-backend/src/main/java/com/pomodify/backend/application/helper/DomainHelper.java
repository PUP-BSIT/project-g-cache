package com.pomodify.backend.application.helper;

import com.pomodify.backend.domain.model.Activity;
import com.pomodify.backend.domain.model.PomodoroSession;
import com.pomodify.backend.domain.model.Category;
import com.pomodify.backend.domain.repository.ActivityRepository;
import com.pomodify.backend.domain.repository.PomodoroSessionRepository;
import com.pomodify.backend.domain.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class DomainHelper {

    private final CategoryRepository categoryRepository;
    private final ActivityRepository activityRepository;
    private final PomodoroSessionRepository pomodoroSessionRepository;

    public Category getCategoryOrThrow(Long categoryId, Long userId) {
        return categoryRepository.findCategory(categoryId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Category not found or unauthorized"));
    }

    public Activity getActivityOrThrow(Long activityId, Long userId) {
        return activityRepository.findActivity(activityId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Activity not found or unauthorized"));
    }

    public PomodoroSession getSessionOrThrow(Long sessionId, Long userId) {
        return pomodoroSessionRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found or unauthorized"));
    }

    public Category getCategoryOrNull(Long categoryId, Long userId) {
        return categoryId == null ? null : categoryRepository.findCategory(categoryId, userId).orElse(null);
    }

    public void checkForExistingCategory (Long user, String categoryName) {
        List<Category> existingCategories = categoryRepository.findAllCategories(user);

        if (existingCategories.stream().anyMatch(cat -> cat.getName().equalsIgnoreCase(categoryName.trim()))) {
            throw new IllegalArgumentException("Category with the same name already exists");
        }
    }
}
