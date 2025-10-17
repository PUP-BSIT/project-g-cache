package com.pomodify.backend.application.dto.response;

/**
 * Generic API response wrapper for consistent response structure.
 * Provides success/error responses with optional data and error details.
 */
public record ApiResponse<T>(
        boolean success,
        String message,
        T data,
        String error
) {
    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>(true, message, data, null);
    }

    public static <T> ApiResponse<T> error(String message, String error) {
        return new ApiResponse<>(false, message, null, error);
    }
}

