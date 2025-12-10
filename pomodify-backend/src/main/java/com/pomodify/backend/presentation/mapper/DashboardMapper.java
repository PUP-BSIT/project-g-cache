package com.pomodify.backend.presentation.mapper;

import com.pomodify.backend.application.result.DashboardResult;
import com.pomodify.backend.presentation.dto.item.RecentSessionItem;
import com.pomodify.backend.presentation.dto.response.DashboardResponse;
import org.springframework.stereotype.Component;

@Component
public class DashboardMapper {

    public DashboardResponse toResponse(DashboardResult r, String layout) {
        return DashboardResponse.builder()
                .currentStreak(r.getCurrentStreak())
                .bestStreak(r.getBestStreak())
                .totalActivities(r.getTotalActivities())
                .totalSessions(r.getTotalSessions())
                .focusHoursToday(secondsToHours(r.getFocusSecondsToday()))
                .focusHoursThisWeek(secondsToHours(r.getFocusSecondsThisWeek()))
                .focusHoursAllTime(secondsToHours(r.getFocusSecondsAllTime()))
                .streakProgressPercent(r.getStreakProgressPercent())
                .consistencyScore(r.getConsistencyScore())
                .topActivityName(r.getTopActivityName())
                .showNewBadge(r.isShowNewBadge())
                .currentBadge(r.getCurrentBadge() != null ? DashboardResponse.BadgeDto.builder()
                    .name(r.getCurrentBadge().getName())
                    .milestoneDays(r.getCurrentBadge().getMilestoneDays())
                    .dateEarned(r.getCurrentBadge().getDateEarned() != null ? r.getCurrentBadge().getDateEarned().toString() : null)
                    .progressPercent(r.getCurrentBadge().getProgressPercent())
                    .build() : null)
                .nextBadge(r.getNextBadge() != null ? DashboardResponse.BadgeDto.builder()
                    .name(r.getNextBadge().getName())
                    .milestoneDays(r.getNextBadge().getMilestoneDays())
                    .dateEarned(null)
                    .progressPercent(r.getNextBadge().getProgressPercent())
                    .build() : null)
                .recentSessions(r.getRecentSessions().stream().map(s -> RecentSessionItem.builder()
                        .id(s.getId())
                        .activityId(s.getActivityId())
                        .activityName(s.getActivityName())
                        .completedAt(s.getCompletedAt())
                        .cyclesCompleted(s.getCyclesCompleted())
                        .focusHours(secondsToHours(s.getFocusSeconds()))
                        .notePreview(resolveNotePreview(s.getNotePreview(), layout))
                        .build()).toList())
                .build();
    }

    private String resolveNotePreview(String content, String layout) {
        if (content == null) return null;
        if (layout == null || layout.equalsIgnoreCase("compact")) {
            int maxLen = 80;
            if (content.length() <= maxLen) {
                return content;
            }
            return content.substring(0, maxLen);
        }
        // detailed layout: return full content
        return content;
    }

    private double secondsToHours(long seconds) {
        return Math.round((seconds / 3600.0) * 10.0) / 10.0; // one decimal place
    }
}
