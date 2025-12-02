package com.pomodify.backend.presentation.dto.response;

import com.pomodify.backend.presentation.dto.item.RecentSessionItem;
import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class DashboardResponse {
    int currentStreak;
    int bestStreak;
    long totalActivities;
    long totalSessions;
    double focusHoursToday;
    double focusHoursThisWeek;
    double focusHoursAllTime;
    List<RecentSessionItem> recentSessions;
}
