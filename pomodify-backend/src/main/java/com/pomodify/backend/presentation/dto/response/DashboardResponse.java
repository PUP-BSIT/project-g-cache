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
    double streakProgressPercent;
    double consistencyScore;
    String topActivityName;
    boolean showNewBadge;
    BadgeDto currentBadge;
    BadgeDto nextBadge;
    List<RecentSessionItem> recentSessions;

    @Value
    @Builder
    public static class BadgeDto {
        String name;
        int milestoneDays;
        String dateEarned;
    }
}
