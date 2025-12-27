package com.pomodify.backend.application.helper;

import com.pomodify.backend.domain.model.Activity;
import com.pomodify.backend.domain.model.PomodoroSession;
import com.pomodify.backend.domain.model.Category;
import com.pomodify.backend.domain.repository.ActivityRepository;
import com.pomodify.backend.domain.repository.PomodoroSessionRepository;
import com.pomodify.backend.domain.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
@RequiredArgsConstructor
public class DomainHelper {

    private final CategoryRepository categoryRepository;
    private final ActivityRepository activityRepository;
    private final PomodoroSessionRepository pomodoroSessionRepository;
    private final Environment environment;

    /**
     * Check if running in dev mode (no auth enforcement).
     * Dev mode is active when profile is "dev", "default", or no profile is set.
     */
    private boolean isDevMode() {
        String[] activeProfiles = environment.getActiveProfiles();
        if (activeProfiles.length == 0) {
            return true; // No profile = dev mode
        }
        return Arrays.stream(activeProfiles)
                .anyMatch(p -> p.equals("dev") || p.equals("default"));
    }

    public Category getCategoryOrThrow(Long categoryId, Long userId) {
        return categoryRepository.findCategory(categoryId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Category not found or unauthorized"));
    }

    public Activity getActivityOrThrow(Long activityId, Long userId) {
        // In dev mode, bypass user ownership check
        if (isDevMode()) {
            return activityRepository.findById(activityId)
                    .orElseThrow(() -> new IllegalArgumentException("Activity not found"));
        }
        return activityRepository.findActivity(activityId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Activity not found or unauthorized"));
    }

    public PomodoroSession getSessionOrThrow(Long sessionId, Long userId) {
        // In dev mode, bypass user ownership check
        if (isDevMode()) {
            return pomodoroSessionRepository.findById(sessionId)
                    .orElseThrow(() -> new IllegalArgumentException("Session not found"));
        }
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
