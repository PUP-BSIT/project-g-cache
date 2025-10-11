package com.pomodify.backend.domain.dto;

import com.pomodify.backend.domain.model.Activity;

import java.util.List;

public record UserResponse(
    String username,
    String email,
    List<Activity> activities
) {
}
