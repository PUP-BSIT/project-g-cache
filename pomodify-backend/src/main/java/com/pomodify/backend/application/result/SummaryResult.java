package com.pomodify.backend.application.result;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record SummaryResult(
    Period period,
    Overview overview,
    Trends trends,
    List<Insight> insights,
    ChartData chartData,
    List<RecentSession> recentSessions,
    List<TopActivity> topActivities,
    int lastMonthAbandonedSessions
) {
    public record Period(LocalDate startDate, LocalDate endDate, String range) {}

    public record Overview(
        double totalFocusHours,
        double totalBreakHours,
        int completionRate,
        int sessionsCount,
        int averageSessionLengthMinutes
    ) {}

    public record Trends(
        TrendMetric focusHours,
        TrendMetric completionRate
    ) {}

    public record TrendMetric(
        double current,
        double previous,
        double changePercent
    ) {}

    public record Insight(
        String type,
        String severity,
        String message,
        String actionable
    ) {}

    public record ChartData(List<String> labels, Datasets datasets) {}

    public record Datasets(List<Double> focus, List<Double> breakHours) {}

    public record RecentSession(
        Long id,
        String activityName,
        LocalDateTime date,
        int focusDurationMinutes,
        int breakDurationMinutes,
        String status,
        String mode
    ) {}

    public record TopActivity(
        int rank,
        String name,
        int totalDurationMinutes,
        int sessionCount
    ) {}
}
