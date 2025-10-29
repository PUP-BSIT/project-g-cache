package com.pomodify.backend.infrastructure.repository.impl;

import com.pomodify.backend.application.dto.ActivitySummaryDTO;
import com.pomodify.backend.application.dto.ActivityDetailsDTO;
import com.pomodify.backend.application.dto.SessionDTO;
import com.pomodify.backend.application.repository.ActivityQueryRepository;
import com.pomodify.backend.domain.model.Activity;
import com.pomodify.backend.infrastructure.repository.spring.SpringActivityJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Repository
@RequiredArgsConstructor
public class ActivityQueryRepositoryImpl implements ActivityQueryRepository {
    private final SpringActivityJpaRepository springActivityJpaRepository;

    @Override
    public List<ActivitySummaryDTO> findAllByUserId(Long userId) {
        return springActivityJpaRepository.findByUserIdAndIsDeletedFalse(userId)
                .stream()
                .map(this::toSummaryDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<ActivitySummaryDTO> findByCategory(Long userId, Long categoryId) {
        return springActivityJpaRepository.findByCategoryIdAndUserIdAndIsDeletedFalse(categoryId, userId)
                .stream()
                .map(this::toSummaryDTO)
                .collect(Collectors.toList());
    }

    @Override
    public Optional<ActivityDetailsDTO> findDetailsById(Long activityId) {
        return springActivityJpaRepository.findById(activityId)
                .map(this::toDetailsDTO);
    }

    @Override
    public List<ActivitySummaryDTO> findScheduledForDate(Long userId, LocalDate date) {
        return springActivityJpaRepository.findScheduledForDate(userId, date)
                .stream()
                .map(this::toSummaryDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<ActivitySummaryDTO> findInProgressByUserId(Long userId) {
        return springActivityJpaRepository.findInProgressByUserId(userId)
                .stream()
                .map(this::toSummaryDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<ActivitySummaryDTO> findCompletedByUserIdAndDateRange(Long userId, LocalDate startDate, LocalDate endDate) {
        return springActivityJpaRepository.findCompletedByUserIdAndDateRange(userId, startDate, endDate)
                .stream()
                .map(this::toSummaryDTO)
                .collect(Collectors.toList());
    }

    private ActivitySummaryDTO toSummaryDTO(Activity activity) {
        return ActivitySummaryDTO.builder()
                .id(activity.getId())
                .name(activity.getTitle())
                .categoryName(activity.getCategory().getName())
                .totalSessions(activity.getCompletedSessions().size())
                .totalDurationMinutes(activity.getTotalTimeSpentMinutes())
                .isScheduled(activity.isScheduled())
                .isInProgress(activity.hasSessionInProgress())
                .build();
    }

    private ActivityDetailsDTO toDetailsDTO(Activity activity) {
        List<SessionDTO> sessionDTOs = activity.getSessions().stream()
                .map(session -> SessionDTO.builder()
                        .id(session.getId())
                        .durationMinutes(session.getDurationMinutes())
                        .startTime(session.getStartTime())
                        .endTime(session.getEndTime())
                        .notes(session.getNotes())
                        .completed(session.isCompleted())
                        .build())
                .collect(Collectors.toList());

        return ActivityDetailsDTO.builder()
                .id(activity.getId())
                .name(activity.getTitle())
                .categoryName(activity.getCategory().getName())
                .description(activity.getDescription())
                .scheduledAt(activity.getScheduledAt())
                .sessions(sessionDTOs)
                .totalCompletedSessions((int) activity.countCompletedSessions())
                .totalDurationMinutes(activity.getTotalTimeSpentMinutes())
                .build();
    }
}