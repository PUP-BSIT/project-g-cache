package com.pomodify.backend.application.commands.handlers;

import com.pomodify.backend.application.commands.CreateActivityCommand;
import com.pomodify.backend.domain.model.Activity;
import com.pomodify.backend.domain.model.Category;
import com.pomodify.backend.domain.repository.CategoryRepository;
import com.pomodify.backend.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CreateActivityHandler {
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;

    @Transactional
    public Long handle(CreateActivityCommand command) {
        Category category = categoryRepository.findById(command.getCategoryId())
                .orElseThrow(() -> new IllegalArgumentException("Category not found"));

        if (!category.getUser().getId().equals(command.getUserId())) {
            throw new IllegalArgumentException("Category does not belong to user");
        }

        Activity activity = Activity.builder()
                .title(command.getName())
                .description(command.getDescription())
                .category(category)
                .user(category.getUser())
                .build();

        category.addActivity(activity);
        categoryRepository.save(category);
        
        return activity.getId();
    }
}