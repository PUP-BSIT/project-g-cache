package com.pomodify.backend.application.commands.handlers;

import com.pomodify.backend.application.commands.CreateCategoryCommand;
import com.pomodify.backend.domain.model.Category;
import com.pomodify.backend.domain.model.User;
import com.pomodify.backend.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CreateCategoryHandler {
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;

    @Transactional
    public Long handle(CreateCategoryCommand command) {
        User user = userRepository.findById(command.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Category category = Category.builder()
                .name(command.getName())
                .user(user)
                .build();

        Category savedCategory = categoryRepository.save(category);
        return savedCategory.getId();
    }
}