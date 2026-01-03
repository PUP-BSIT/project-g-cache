package com.pomodify.backend.presentation.mapper;

import com.pomodify.backend.application.result.UserResult;
import com.pomodify.backend.presentation.dto.response.UserResponse;

public class UserMapper {

    private UserMapper() {} // prevent instantiation

    public static UserResponse toUserResponse(UserResult result) {
        if (result == null) return null;
        return new UserResponse(
                result.firstName(),
                result.lastName(),
                result.email(),
                result.isEmailVerified(),
                result.backupEmail()
        );
    }
}
