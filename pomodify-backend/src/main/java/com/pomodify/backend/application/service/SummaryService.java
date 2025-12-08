package com.pomodify.backend.application.service;

import com.pomodify.backend.application.command.report.SummaryCommand;
import com.pomodify.backend.application.result.SummaryResult;
import com.pomodify.backend.domain.enums.SessionStatus;
import com.pomodify.backend.domain.model.PomodoroSession;
import com.pomodify.backend.domain.repository.PomodoroSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SummaryService {

    private final PomodoroSessionRepository sessionRepository;

    @Transactional(readOnly = true)
    public SummaryResult getSummary(SummaryCommand cmd) {
        ZoneId zone = cmd.zoneId();
        Long userId = cmd.userId();

        LocalDate start = cmd.startDate();
        LocalDate end = cmd.endDate();
        LocalDateTime startDt = start.atStartOfDay();
        LocalDateTime endDt = end.plusDays(1).atStartOfDay().minusNanos(1);

        // Also include non-completed statuses for completionRate and recent list
        // For now, fetch all and filter by range to include various statuses
        List<PomodoroSession> allInRange = sessionRepository.findByUserId(userId).stream()
                .filter(s -> s.getCompletedAt() != null)
                .filter(s -> !s.isDeleted())
                .filter(s -> !s.getCompletedAt().isBefore(startDt) && !s.getCompletedAt().isAfter(endDt))
                .collect(Collectors.toList());

        // Last month abandoned sessions (based on calendar last month relative to current period end)
        LocalDate lastMonthStart = end.minusMonths(1).withDayOfMonth(1);
        LocalDate lastMonthEnd = end.minusMonths(1).withDayOfMonth(end.minusMonths(1).lengthOfMonth());
        LocalDateTime lastMonthStartDt = lastMonthStart.atStartOfDay();
        LocalDateTime lastMonthEndDt = lastMonthEnd.plusDays(1).atStartOfDay().minusNanos(1);
        int lastMonthAbandoned = (int) sessionRepository.findByUserId(userId).stream()
            .filter(s -> s.getCompletedAt() != null)
            .filter(s -> !s.isDeleted())
            .filter(s -> !s.getCompletedAt().isBefore(lastMonthStartDt) && !s.getCompletedAt().isAfter(lastMonthEndDt))
            .filter(s -> s.getStatus() == SessionStatus.ABANDONED)
            .count();

        // Current-period metrics
        long totalFocusSeconds = sumFocusSeconds(allInRange);
        long totalBreakSeconds = sumBreakSeconds(allInRange);
        double totalFocusedHours = round1(totalFocusSeconds / 3600.0);
        double totalBreakHours = round1(totalBreakSeconds / 3600.0);

        long totalSessions = allInRange.size();
        long completedOrFinished = allInRange.stream()
            .filter(s -> s.getStatus() == SessionStatus.COMPLETED)
            .count();
        int completionRate = totalSessions == 0
            ? 0
            : (int) Math.round((completedOrFinished * 100.0) / totalSessions);

        int avgSessionMinutes = totalSessions == 0
            ? 0
            : (int) Math.round((totalFocusSeconds / 60.0) / totalSessions);

        // Chart data
        SummaryResult.ChartData chartData = buildChartData(cmd.range(), start, end, allInRange, zone);

        // Recent sessions (limit 10)
        List<PomodoroSession> recent = sessionRepository.findRecentCompletedByUserId(userId, 10);
        List<SummaryResult.RecentSession> recentItems = recent.stream().map(s ->
            new SummaryResult.RecentSession(
                s.getId(),
                s.getActivity().getTitle(),
                s.getCompletedAt(),
                (int) (long) Optional.ofNullable(s.getFocusDuration())
                        .map(Duration::toMinutes)
                        .orElse(0L),
                (int) (long) Optional.ofNullable(s.getBreakDuration())
                        .map(Duration::toMinutes)
                        .orElse(0L),
                s.getStatus().name(),
                s.getSessionType().name()
            )
        ).collect(Collectors.toList());

        // Top activities (by focus minutes, desc, top 10)
        Map<String, Integer> totals = new HashMap<>();
        Map<String, Integer> counts = new HashMap<>();
        for (PomodoroSession s : allInRange) {
            String name = s.getActivity().getTitle();
            int minutes = (int) (Optional.ofNullable(s.getFocusDuration())
                    .map(Duration::toMinutes)
                    .orElse(0L) * s.getCyclesCompleted());
            totals.merge(name, minutes, Integer::sum);
            counts.merge(name, 1, Integer::sum);
        }
        List<SummaryResult.TopActivity> topActivities = new ArrayList<>(totals.entrySet().stream()
                .sorted((a, b) -> Integer.compare(b.getValue(), a.getValue()))
                .limit(10)
                .map(e -> new SummaryResult.TopActivity(
                        0,
                        e.getKey(),
                        e.getValue(),
                        counts.getOrDefault(e.getKey(), 0)
                ))
                .toList());
        // assign ranks
        for (int i = 0; i < topActivities.size(); i++) {
            SummaryResult.TopActivity ta = topActivities.get(i);
            topActivities.set(i, new SummaryResult.TopActivity(
                i + 1,
                ta.name(),
                ta.totalDurationMinutes(),
                ta.sessionCount()
            ));
        }

        // Previous period metrics for trends
        long days = end.toEpochDay() - start.toEpochDay() + 1;
        LocalDate prevEnd = start.minusDays(1);
        LocalDate prevStart = prevEnd.minusDays(days - 1);
        LocalDateTime prevStartDt = prevStart.atStartOfDay();
        LocalDateTime prevEndDt = prevEnd.plusDays(1).atStartOfDay().minusNanos(1);

        List<PomodoroSession> allPrevious = sessionRepository.findByUserId(userId).stream()
            .filter(s -> s.getCompletedAt() != null)
            .filter(s -> !s.isDeleted())
            .filter(s -> !s.getCompletedAt().isBefore(prevStartDt) && !s.getCompletedAt().isAfter(prevEndDt))
            .toList();

        long prevFocusSeconds = sumFocusSeconds(allPrevious);
        double prevFocusHours = round1(prevFocusSeconds / 3600.0);
        long prevTotalSessions = allPrevious.size();
        long prevCompleted = allPrevious.stream()
            .filter(s -> s.getStatus() == SessionStatus.COMPLETED)
            .count();
        int prevCompletionRate = prevTotalSessions == 0
            ? 0
            : (int) Math.round((prevCompleted * 100.0) / prevTotalSessions);

        SummaryResult.TrendMetric focusTrend = new SummaryResult.TrendMetric(
            totalFocusedHours,
            prevFocusHours,
            computeChangePercent(prevFocusHours, totalFocusedHours)
        );
        SummaryResult.TrendMetric completionTrend = new SummaryResult.TrendMetric(
            completionRate,
            prevCompletionRate,
            computeChangePercent(prevCompletionRate, completionRate)
        );

        SummaryResult.Overview overview = new SummaryResult.Overview(
            totalFocusedHours,
            totalBreakHours,
            completionRate,
            (int) totalSessions,
            avgSessionMinutes
        );

        SummaryResult.Trends trends = new SummaryResult.Trends(focusTrend, completionTrend);

        java.util.List<SummaryResult.Insight> insights = buildInsights(overview, trends);

        return new SummaryResult(
            new SummaryResult.Period(start, end, toRangeString(cmd.range())),
            overview,
            trends,
            insights,
            chartData,
            recentItems,
            topActivities,
            lastMonthAbandoned
        );
    }

    private SummaryResult.ChartData buildChartData(SummaryCommand.Range range, LocalDate start, LocalDate end, List<PomodoroSession> sessions, ZoneId zone) {
        List<String> labels = new ArrayList<>();
        List<Double> focus = new ArrayList<>();
        List<Double> breaks = new ArrayList<>();

        if (range == SummaryCommand.Range.WEEKLY) {
            LocalDate cursor = start;
            while (!cursor.isAfter(end)) {
                labels.add(cursor.getDayOfWeek().name().charAt(0)
                        + cursor.getDayOfWeek().name().substring(1,3).toLowerCase()); // Mon, Tue
                cursor = getLocalDate(sessions, zone, focus, breaks, cursor);
            }
        } else if (range == SummaryCommand.Range.MONTHLY) {
            LocalDate cursor = start;
            while (!cursor.isAfter(end)) {
                labels.add(String.valueOf(cursor.getDayOfMonth()));
                cursor = getLocalDate(sessions, zone, focus, breaks, cursor);
            }
        } else { // YEARLY
            for (Month m : Month.values()) {
                labels.add(m.name().charAt(0) + m.name().substring(1,3).toLowerCase());
                long focusSeconds = sessions.stream().filter(s
                                -> toLocalDate(s.getCompletedAt(), zone).getMonth() == m)
                        .mapToLong(this::focusSecondsOf).sum();
                long breakSeconds = sessions.stream().filter(s
                                -> toLocalDate(s.getCompletedAt(), zone).getMonth() == m)
                        .mapToLong(this::breakSecondsOf).sum();
                focus.add(round1(focusSeconds / 3600.0));
                breaks.add(round1(breakSeconds / 3600.0));
            }
        }

        return new SummaryResult.ChartData(
            labels,
            new SummaryResult.Datasets(focus, breaks)
        );
    }

    private LocalDate getLocalDate(List<PomodoroSession> sessions, ZoneId zone, List<Double> focus, List<Double> breaks, LocalDate cursor) {
        final LocalDate day = cursor;
        long focusSeconds = sessions.stream().filter(s
                        -> toLocalDate(s.getCompletedAt(), zone).equals(day))
                .mapToLong(this::focusSecondsOf).sum();
        long breakSeconds = sessions.stream().filter(s
                        -> toLocalDate(s.getCompletedAt(), zone).equals(day))
                .mapToLong(this::breakSecondsOf).sum();
        focus.add(round1(focusSeconds / 3600.0));
        breaks.add(round1(breakSeconds / 3600.0));
        cursor = cursor.plusDays(1);
        return cursor;
    }

    private LocalDate toLocalDate(LocalDateTime dt, ZoneId zone) {
        return dt.atZone(zone).toLocalDate();
    }

    private long sumFocusSeconds(List<PomodoroSession> sessions) {
        return sessions.stream().mapToLong(this::focusSecondsOf).sum();
    }

    private long sumBreakSeconds(List<PomodoroSession> sessions) {
        return sessions.stream().mapToLong(this::breakSecondsOf).sum();
    }

    private long focusSecondsOf(PomodoroSession s) {
        long focusPerCycle = s.getFocusDuration() != null ? s.getFocusDuration().getSeconds() : 0L;
        return (long) s.getCyclesCompleted() * focusPerCycle;
    }

    private long breakSecondsOf(PomodoroSession s) {
        long breakPerCycle = s.getBreakDuration() != null ? s.getBreakDuration().getSeconds() : 0L;
        return (long) s.getCyclesCompleted() * breakPerCycle;
    }

    private double round1(double v) { return Math.round(v * 10.0) / 10.0; }

    private String toRangeString(SummaryCommand.Range r) {
        return switch (r) {
            case WEEKLY -> "week";
            case MONTHLY -> "monthly";
            case YEARLY -> "yearly";
        };
    }

    private double computeChangePercent(double previous, double current) {
        if (previous == 0) {
            return current == 0 ? 0.0 : 100.0;
        }
        return round1(((current - previous) / previous) * 100.0);
    }

    private java.util.List<SummaryResult.Insight> buildInsights(SummaryResult.Overview overview, SummaryResult.Trends trends) {
        java.util.List<SummaryResult.Insight> insights = new java.util.ArrayList<>();

        if (trends.focusHours().changePercent() > 0) {
            insights.add(new SummaryResult.Insight(
                    "positive",
                    "high",
                    "Great job! Your focus hours increased this period.",
                    "Keep up the momentum!"
            ));
        }

        double totalHours = overview.totalFocusHours() + overview.totalBreakHours();
        if (totalHours > 0) {
            double breakRatio = overview.totalBreakHours() / totalHours;
            if (breakRatio > 0.4) {
                insights.add(new SummaryResult.Insight(
                        "warning",
                        "medium",
                        "Break time is a large portion of your total time.",
                        "Consider slightly shorter breaks to maintain flow."
                ));
            }
        }

        if (overview.completionRate() < 50 && overview.sessionsCount() >= 5) {
            insights.add(new SummaryResult.Insight(
                    "warning",
                    "medium",
                    "Many sessions are not being completed.",
                    "Try reducing session length or improving focus conditions."
            ));
        }

        return insights;
    }
}
