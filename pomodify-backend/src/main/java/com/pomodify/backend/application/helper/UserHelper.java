package com.pomodify.backend.application.helper;

import com.pomodify.backend.domain.model.User;
import com.pomodify.backend.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class UserHelper {

    private final UserRepository userRepository;

    public User getUserOrThrow(Long userId) {
        return userRepository.findUser(userId)
                .orElseThrow(() -> new IllegalStateException("User not found"));
    }
}
