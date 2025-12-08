package com.pomodify.backend.application.result;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.List;

@Value
@Builder
public class DashboardResult {
    int currentStreak;
    int bestStreak;
    long totalActivities;
    long totalSessions;
    long focusSecondsToday;
    long focusSecondsThisWeek;
    long focusSecondsAllTime;
    double streakProgressPercent;
    double consistencyScore;
    String topActivityName;
    boolean showNewBadge;
    Badge currentBadge;
    Badge nextBadge;
    List<RecentSession> recentSessions;

    @Value
    @Builder
    public static class RecentSession {
        Long id;
        Long activityId;
        String activityName;
        LocalDateTime completedAt;
        int cyclesCompleted;
        long focusSeconds; // derived: cyclesCompleted * focusDurationSeconds
        String notePreview;
    }

    @Value
    @Builder
    public static class Badge {
        String name;
        int milestoneDays;
        java.time.LocalDate dateEarned;
        double progressPercent;
    }
}
