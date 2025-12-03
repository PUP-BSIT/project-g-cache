package com.pomodify.backend.application.service;

import com.pomodify.backend.application.command.report.SummaryCommand;
import com.pomodify.backend.application.result.SummaryResult;
import com.pomodify.backend.domain.enums.SessionStatus;
import com.pomodify.backend.domain.model.PomodoroSession;
import com.pomodify.backend.domain.repository.PomodoroSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SummaryService {

    private final PomodoroSessionRepository sessionRepository;

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

        // Metrics
        long totalFocusSeconds = sumFocusSeconds(allInRange);
        double totalFocusedHours = round1(totalFocusSeconds / 3600.0);

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

        return new SummaryResult(
            new SummaryResult.Meta(toRangeString(cmd.range()), start, end),
            new SummaryResult.Metrics(totalFocusedHours, completionRate, avgSessionMinutes),
            chartData,
            recentItems,
            topActivities
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
}
