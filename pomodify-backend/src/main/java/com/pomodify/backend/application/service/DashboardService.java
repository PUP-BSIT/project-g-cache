package com.pomodify.backend.application.service;

import com.pomodify.backend.application.command.dashboard.DashboardCommand;
import com.pomodify.backend.application.result.DashboardResult;
import com.pomodify.backend.domain.model.PomodoroSession;
import com.pomodify.backend.domain.model.User;
import com.pomodify.backend.domain.repository.ActivityRepository;
import com.pomodify.backend.domain.repository.PomodoroSessionRepository;
import com.pomodify.backend.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final UserRepository userRepository;
    private final ActivityRepository activityRepository;
    private final PomodoroSessionRepository sessionRepository;

    public DashboardResult getDashboard(DashboardCommand cmd) {
        ZoneId zone = cmd.getZoneId();
        Long userId = cmd.getUserId();
        int limit = cmd.getRecentLimit();

        User user = userRepository.findUser(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Date boundaries
        LocalDate today = LocalDate.now(zone);
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.plusDays(1).atStartOfDay().minusNanos(1);

        LocalDate startOfWeekDate = today.with(java.time.DayOfWeek.MONDAY); // ISO week
        LocalDateTime startOfWeek = startOfWeekDate.atStartOfDay();
        LocalDateTime endOfWeek = startOfWeek.plusDays(7).minusNanos(1);

        // Data fetch
        long totalActivities = Optional.ofNullable(activityRepository.countActivities(userId, false, null)).orElse(0L);
        List<PomodoroSession> sessionsToday = sessionRepository.findCompletedByUserIdBetween(userId, startOfDay, endOfDay);
        List<PomodoroSession> sessionsThisWeek = sessionRepository.findCompletedByUserIdBetween(userId, startOfWeek, endOfWeek);
        List<PomodoroSession> sessionsAll = sessionRepository.findCompletedByUserId(userId);
        List<PomodoroSession> recent = sessionRepository.findRecentCompletedByUserId(userId, limit);

        long focusSecondsToday = sumFocusSeconds(sessionsToday);
        long focusSecondsWeek = sumFocusSeconds(sessionsThisWeek);
        long focusSecondsAll = sumFocusSeconds(sessionsAll);
        long totalSessions = sessionsAll.size();

        // Focus days for streaks
        Set<LocalDate> focusDays = sessionsAll.stream()
            .filter(s -> s.getCompletedAt() != null)
            .map(s -> s.getCompletedAt().atZone(zone).toLocalDate())
            .collect(Collectors.toSet());

        int currentStreak = user.getCurrentStreak(focusDays, today, zone);
        int bestStreak = user.getBestStreak(focusDays);

        List<DashboardResult.RecentSession> recentItems = recent.stream().map(s ->
                DashboardResult.RecentSession.builder()
                        .id(s.getId())
                        .activityId(s.getActivity().getId())
                        .activityName(s.getActivity().getTitle())
                        .completedAt(s.getCompletedAt())
                        .cyclesCompleted(s.getCyclesCompleted())
                        .focusSeconds(focusSecondsOf(s))
                        .build()
        ).toList();

        return DashboardResult.builder()
                .currentStreak(currentStreak)
                .bestStreak(bestStreak)
                .totalActivities(totalActivities)
                .totalSessions(totalSessions)
                .focusSecondsToday(focusSecondsToday)
                .focusSecondsThisWeek(focusSecondsWeek)
                .focusSecondsAllTime(focusSecondsAll)
                .recentSessions(recentItems)
                .build();
    }

    private long sumFocusSeconds(List<PomodoroSession> sessions) {
        return sessions.stream().mapToLong(this::focusSecondsOf).sum();
    }

    private long focusSecondsOf(PomodoroSession s) {
        // Approximate focus time by cyclesCompleted * focusDuration seconds
        long focusPerCycle = s.getFocusDuration() != null ? s.getFocusDuration().getSeconds() : 0L;
        return (long) s.getCyclesCompleted() * focusPerCycle;
    }
}
