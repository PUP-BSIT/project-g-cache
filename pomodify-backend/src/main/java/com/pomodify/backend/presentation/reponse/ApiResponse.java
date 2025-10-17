package com.pomodify.backend.domain.dto;

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
