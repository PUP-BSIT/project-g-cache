package com.pomodify.backend.application.services;

import com.pomodify.backend.application.mapper.ActivityDTOMapper;
import com.pomodify.backend.application.repository.ActivityQueryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ActivityQueryService {
    private final ActivityQueryRepository activityQueryRepository;

    public List<ActivitySummaryDTO> getUserActivities(Long userId) {
        return activityQueryRepository.findAllByUserId(userId);
    }

    public List<ActivitySummaryDTO> getCategoryActivities(Long userId, Long categoryId) {
        return activityQueryRepository.findByCategory(userId, categoryId);
    }

    public com.pomodify.backend.presentation.dto.response.ActivityDetailsDTO getActivityDetails(Long activityId) {
        return ActivityDTOMapper.toResponse(
            activityQueryRepository.findDetailsById(activityId)
                .orElseThrow(() -> new IllegalArgumentException("Activity not found"))
        );
    }

    public List<ActivitySummaryDTO> getScheduledActivities(Long userId, LocalDate date) {
        return activityQueryRepository.findScheduledForDate(userId, date);
    }

    public List<ActivitySummaryDTO> getInProgressActivities(Long userId) {
        return activityQueryRepository.findInProgressByUserId(userId);
    }
}