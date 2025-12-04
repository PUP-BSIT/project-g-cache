package com.pomodify.backend.presentation.dto.item;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record SummaryItem(
        Meta meta,
        Metrics metrics,
        ChartData chartData,
        List<RecentSession> recentSessions,
        List<TopActivity> topActivities
) {
    public record Meta(String range, LocalDate startDate, LocalDate endDate) {}
    public record Metrics(double totalFocusedHours, int completionRate, int avgSessionMinutes) {}
    public record ChartData(List<String> labels, Datasets datasets) {}
    public record Datasets(List<Double> focus, List<Double> breakHours) {}
    public record RecentSession(Long id, String activityName, LocalDateTime date, int focusDurationMinutes, int breakDurationMinutes, String status, String mode) {}
    public record TopActivity(int rank, String name, int totalDurationMinutes, int sessionCount) {}
}
