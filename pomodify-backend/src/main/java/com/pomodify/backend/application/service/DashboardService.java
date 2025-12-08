package com.pomodify.backend.application.service;

import com.pomodify.backend.application.command.dashboard.DashboardCommand;
import com.pomodify.backend.application.result.DashboardResult;
import com.pomodify.backend.domain.model.PomodoroSession;
import com.pomodify.backend.domain.model.User;
import com.pomodify.backend.domain.enums.CyclePhase;
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
    private final com.pomodify.backend.application.service.BadgeService badgeService;

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
        // Include in-progress session elapsed time if an active session exists for today
        List<PomodoroSession> activeSessions = sessionRepository.findActiveByUserId(userId);
        List<PomodoroSession> sessionsThisWeek = sessionRepository.findCompletedByUserIdBetween(userId, startOfWeek, endOfWeek);
        List<PomodoroSession> sessionsAll = sessionRepository.findCompletedByUserId(userId);
        List<PomodoroSession> recent = sessionRepository.findRecentCompletedByUserId(userId, limit);

        long focusSecondsToday = sumFocusSeconds(sessionsToday);
        // add in-progress elapsed focusSeconds if any in-progress session exists
        for (PomodoroSession s : activeSessions) {
            if (s.getStatus() != null && s.getStatus().name().equals("IN_PROGRESS")) {
                // compute elapsed time in current phase
                long elapsed = s.calculateTotalElapsed().getSeconds();
                if (s.getCurrentPhase() == CyclePhase.FOCUS) {
                    focusSecondsToday += elapsed;
                }
            }
        }
        long focusSecondsWeek = sumFocusSeconds(sessionsThisWeek);
        long focusSecondsAll = sumFocusSeconds(sessionsAll);
        long totalSessions = sessionsAll.size();

        // Focus days for streaks
        Set<LocalDate> focusDays = sessionsAll.stream()
            .filter(s -> s.getCompletedAt() != null)
            .map(s -> s.getCompletedAt().atZone(zone).toLocalDate())
            .collect(Collectors.toSet());

        int currentStreak = user.getCurrentStreak(focusDays, today);
        int bestStreak = user.getBestStreak(focusDays);

        // Compute additional metrics: consistency score, top activity
        LocalDate nowDate = today;
        LocalDate last7Start = nowDate.minusDays(6); // 7 day window inclusive
        long daysWithCompletedInWindow = sessionRepository.findCompletedByUserIdBetween(userId, last7Start.atStartOfDay(), endOfDay)
                .stream().map(sess -> sess.getCompletedAt().atZone(zone).toLocalDate()).distinct().count();

        double consistencyScore = (double) daysWithCompletedInWindow / 7.0 * 100.0;
        if (currentStreak > 0) { // small boost
            consistencyScore = Math.min(100.0, consistencyScore + 10.0);
        }

        // top activity for the last 7 days
        Map<Long, Long> activitySeconds = new HashMap<>();
        for (PomodoroSession ss : sessionRepository.findCompletedByUserIdBetween(userId, last7Start.atStartOfDay(), endOfDay)) {
            long sec = focusSecondsOf(ss);
            Long prev = activitySeconds.getOrDefault(ss.getActivity().getId(), 0L);
            activitySeconds.put(ss.getActivity().getId(), prev + sec);
        }
        String topActivityName = null;
        double topActivityHours = 0.0;
        if (!activitySeconds.isEmpty()) {
            Long topActivityId = activitySeconds.entrySet().stream().max(Map.Entry.comparingByValue()).get().getKey();
            Long topSeconds = activitySeconds.get(topActivityId);
            // Lookup activity name
            topActivityName = activityRepository.findActivity(topActivityId, userId).map(a -> a.getTitle() + " (" + Math.round((topSeconds / 3600.0) * 10.0) / 10.0 + "h)").orElse(null);
            topActivityHours = Math.round((topSeconds / 3600.0) * 10.0) / 10.0;
        }

        List<DashboardResult.RecentSession> recentItems = recent.stream().map(s ->
                DashboardResult.RecentSession.builder()
                        .id(s.getId())
                        .activityId(s.getActivity().getId())
                        .activityName(s.getActivity().getTitle())
                        .completedAt(s.getCompletedAt())
                        .cyclesCompleted(s.getCyclesCompleted())
                        .focusSeconds(focusSecondsOf(s))
                        .notePreview(s.getNote() != null ? s.getNote().getContent() : null)
                        .build()
        ).toList();

        // Badges
        List<com.pomodify.backend.domain.model.UserBadge> badges = badgeService.getBadgesForUser(userId);
        com.pomodify.backend.application.result.DashboardResult.Badge currentBadge = null;
        com.pomodify.backend.application.result.DashboardResult.Badge nextBadge = null;
        if (badges != null && !badges.isEmpty()) {
            int highest = badges.stream().mapToInt(b -> b.getMilestoneDays()).max().orElse(0);
            com.pomodify.backend.domain.model.UserBadge highestBadge = badges.stream().filter(b -> b.getMilestoneDays() == highest).findFirst().orElse(null);
            if (highestBadge != null) {
                currentBadge = com.pomodify.backend.application.result.DashboardResult.Badge.builder()
                        .name(highestBadge.getName())
                        .milestoneDays(highestBadge.getMilestoneDays())
                        .dateEarned(highestBadge.getDateAwarded())
                        .progressPercent(100.0)
                        .build();
            }
            // Determine next badge
            List<Integer> milestones = List.of(3,7,14,30,100,365);
            for (int m : milestones) {
                if (highest < m) {
                    nextBadge = com.pomodify.backend.application.result.DashboardResult.Badge.builder()
                            .name(m == 3 ? "The Bookmark" : m == 7 ? "Deep Work" : m == 14 ? "The Protégé" : m == 30 ? "The Curator" : m == 100 ? "The Scholar" : "The Alchemist")
                            .milestoneDays(m)
                            .progressPercent(0.0)
                            .build();
                    break;
                }
            }
        } else {
            // No badges yet; next badge default to 3
            nextBadge = com.pomodify.backend.application.result.DashboardResult.Badge.builder()
                    .name("The Bookmark")
                    .milestoneDays(3)
                    .progressPercent(0.0)
                    .build();
        }

        // compute nextBadge progress; default to 0.0
        double nextProgress = 0.0;
        if (nextBadge != null) {
            int goal = nextBadge.getMilestoneDays();
            int goalThreshold = goal > 0 ? goal : 3;
            nextProgress = Math.min(100.0, ((double) currentStreak / (double) goalThreshold) * 100.0);
        }

        if (nextBadge != null) {
            nextBadge = com.pomodify.backend.application.result.DashboardResult.Badge.builder()
                    .name(nextBadge.getName())
                    .milestoneDays(nextBadge.getMilestoneDays())
                    .progressPercent(Math.round(nextProgress * 10.0) / 10.0)
                    .dateEarned(null)
                    .build();
        }

        boolean showNewBadge = false;
        if (badges != null) {
            showNewBadge = badges.stream().anyMatch(b -> b.getDateAwarded() != null && b.getDateAwarded().isEqual(java.time.LocalDate.now()));
        }

        // compute streak progress toward beating best streak (or first goal)
        double streakProgressPercent;
        if (bestStreak > 0) {
            double goal = bestStreak + 1.0;
            streakProgressPercent = Math.min(100.0, ((double) currentStreak / goal) * 100.0);
        } else {
            int defaultGoal = 3;
            streakProgressPercent = Math.min(100.0, ((double) currentStreak / (double) defaultGoal) * 100.0);
        }

        return DashboardResult.builder()
                .currentStreak(currentStreak)
                .bestStreak(bestStreak)
                .totalActivities(totalActivities)
                .totalSessions(totalSessions)
                .focusSecondsToday(focusSecondsToday)
                .focusSecondsThisWeek(focusSecondsWeek)
                .focusSecondsAllTime(focusSecondsAll)
            .streakProgressPercent(Math.round(streakProgressPercent * 10.0) / 10.0)
            .consistencyScore(Math.round(consistencyScore * 10.0) / 10.0)
            .topActivityName(topActivityName)
                .showNewBadge(showNewBadge)
                .currentBadge(currentBadge)
                .nextBadge(nextBadge)
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
