package com.pomodify.backend.application.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ActivityQueryRepository {
    List<ActivitySummaryDTO> findAllByUserId(Long userId);
    List<ActivitySummaryDTO> findByCategory(Long userId, Long categoryId);
    Optional<ActivityDetailsDTO> findDetailsById(Long activityId);
    List<ActivitySummaryDTO> findScheduledForDate(Long userId, LocalDate date);
    List<ActivitySummaryDTO> findInProgressByUserId(Long userId);
    List<ActivitySummaryDTO> findCompletedByUserIdAndDateRange(Long userId, LocalDate startDate, LocalDate endDate);
}