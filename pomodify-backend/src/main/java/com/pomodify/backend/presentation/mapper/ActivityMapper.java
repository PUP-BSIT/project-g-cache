package com.pomodify.backend.presentation.mapper;

import com.pomodify.backend.application.result.ActivityResult;
import com.pomodify.backend.presentation.dto.item.ActivityItem;
import com.pomodify.backend.presentation.dto.response.ActivityResponse;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.stream.Collectors;

public class ActivityMapper {
    private ActivityMapper() { }

    public static ActivityItem toActivityItem(ActivityResult result) {
        if (result == null) {
            return ActivityItem.builder().build();
        }

        return ActivityItem.builder()
                .activityId(result.activityId())
                .categoryId(result.categoryId())
                .activityTitle(result.activityTitle())
                .activityDescription(result.activityDescription())
                .build();
    }

    // For a single activity response
    public static ActivityResponse toActivityResponse(ActivityItem activityItem, String message) {
        return ActivityResponse.builder()
                .activities(List.of(activityItem))
                .message(message)
                .currentPage(0)
                .totalPages(1)
                .totalItems(activityItem.activityId() != null ? 1 : 0)
                .build();
    }

    // For a paged response (used in getAllActivities)
    public static ActivityResponse toActivityResponse(Page<ActivityItem> page, String message) {
        return ActivityResponse.builder()
                .activities(page.getContent())
                .message(message)
                .currentPage(page.getNumber())
                .totalPages(page.getTotalPages())
                .totalItems(page.getTotalElements())
                .build();
    }
}
