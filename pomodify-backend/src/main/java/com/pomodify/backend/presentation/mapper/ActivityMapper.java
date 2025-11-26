package com.pomodify.backend.presentation.mapper;

import com.pomodify.backend.application.result.ActivityResult;
import com.pomodify.backend.presentation.dto.item.ActivityItem;
import com.pomodify.backend.presentation.dto.response.ActivityResponse;
import org.springframework.data.domain.Page;
import java.util.List;

public class ActivityMapper {

    public static ActivityItem toActivityItem(ActivityResult result) {
        if (result == null) return ActivityItem.builder().build();

        return ActivityItem.builder()
                .activityId(result.activityId())
                .categoryId(result.categoryId())
                .activityTitle(result.activityTitle())
                .activityDescription(result.activityDescription())
                .build();
    }

    public static Page<ActivityItem> toActivityItemPage(Page<ActivityResult> resultsPage) {
        return resultsPage.map(ActivityMapper::toActivityItem);
    }

    public static ActivityResponse toActivityResponse(Page<ActivityItem> items, String message) {
        return ActivityResponse.builder()
                .activities(items.getContent())
                .message(message)
                .currentPage(items.getNumber())
                .totalPages(items.getTotalPages())
                .totalItems(items.getTotalElements())
                .build();
    }

    public static ActivityResponse toActivityResponse(ActivityItem item, String message) {
        return ActivityResponse.builder()
                .activities(List.of(item))
                .message(message)
                .currentPage(0)
                .totalPages(1)
                .totalItems(item.activityId() != null ? 1 : 0)
                .build();
    }
}

