package com.pomodify.backend.presentation.mapper;

import com.pomodify.backend.application.result.AuthResult;
import com.pomodify.backend.presentation.dto.response.AuthResponse;
import com.pomodify.backend.presentation.dto.response.UserResponse;

public class AuthMapper {

    private AuthMapper() {} // prevent instantiation

    public static AuthResponse toAuthResponse(AuthResult result) {
        if (result == null) return null;

        UserResponse userResponse = new UserResponse(
            result.firstName(),
            result.lastName(),
            result.email(),
            result.isEmailVerified(),
            null, // backupEmail not available in auth context
            null  // profilePictureUrl not available in auth context
        );

        return new AuthResponse(
                userResponse,
                result.accessToken(),
                result.refreshToken()
        );
    }
}

