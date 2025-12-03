package com.pomodify.backend.presentation.mapper;

import com.pomodify.backend.application.result.DashboardResult;
import com.pomodify.backend.presentation.dto.item.RecentSessionItem;
import com.pomodify.backend.presentation.dto.response.DashboardResponse;
import org.springframework.stereotype.Component;

@Component
public class DashboardMapper {

    public DashboardResponse toResponse(DashboardResult r) {
        return DashboardResponse.builder()
                .currentStreak(r.getCurrentStreak())
                .bestStreak(r.getBestStreak())
                .totalActivities(r.getTotalActivities())
                .totalSessions(r.getTotalSessions())
                .focusHoursToday(secondsToHours(r.getFocusSecondsToday()))
                .focusHoursThisWeek(secondsToHours(r.getFocusSecondsThisWeek()))
                .focusHoursAllTime(secondsToHours(r.getFocusSecondsAllTime()))
                .recentSessions(r.getRecentSessions().stream().map(s -> RecentSessionItem.builder()
                        .id(s.getId())
                        .activityId(s.getActivityId())
                        .activityName(s.getActivityName())
                        .completedAt(s.getCompletedAt())
                        .cyclesCompleted(s.getCyclesCompleted())
                        .focusHours(secondsToHours(s.getFocusSeconds()))
                        .build()).toList())
                .build();
    }

    private double secondsToHours(long seconds) {
        return Math.round((seconds / 3600.0) * 10.0) / 10.0; // one decimal place
    }
}
