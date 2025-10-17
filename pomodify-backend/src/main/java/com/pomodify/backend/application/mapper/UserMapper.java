package com.pomodify.backend.application.mapper;

import com.pomodify.backend.application.dto.response.UserResponse;
import com.pomodify.backend.domain.model.User;
import org.springframework.stereotype.Component;

/**
 * Mapper for converting User domain entities to DTOs.
 * Application layer responsibility - keeps domain entities from leaking to presentation.
 */
@Component
public class UserMapper {

    /**
     * Convert User entity to UserResponse DTO.
     * Excludes sensitive information like password hash.
     */
    public UserResponse toUserResponse(User user) {
        if (user == null) {
            return null;
        }

        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail().getValue(),
                user.isEmailVerified(),
                user.getCreatedAt()
        );
    }
}

