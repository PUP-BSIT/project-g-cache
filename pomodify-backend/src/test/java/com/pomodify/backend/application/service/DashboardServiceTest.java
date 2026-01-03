package com.pomodify.backend.application.service;

import com.pomodify.backend.application.command.dashboard.DashboardCommand;
import com.pomodify.backend.application.result.DashboardResult;
import com.pomodify.backend.domain.enums.SessionStatus;
import com.pomodify.backend.domain.model.Activity;
import com.pomodify.backend.domain.model.PomodoroSession;
import com.pomodify.backend.domain.model.User;
import com.pomodify.backend.domain.repository.ActivityRepository;
import com.pomodify.backend.domain.repository.PomodoroSessionRepository;
import com.pomodify.backend.domain.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import com.pomodify.backend.application.service.BadgeService;
import org.mockito.MockitoAnnotations;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

public class DashboardServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private ActivityRepository activityRepository;
        @Mock private PomodoroSessionRepository sessionRepository;
        @Mock private BadgeService badgeService;

    private DashboardService service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new DashboardService(userRepository, activityRepository, sessionRepository, badgeService);
    }

    @Test
    void aggregates_totals_focus_and_streaks_with_recent_sessions() {
        Long userId = 42L;
        ZoneId zone = ZoneId.systemDefault();
        User user = User.builder()
                .id(userId)
                .firstName("A")
                .lastName("B")
                .passwordHash("x")
                .email(new com.pomodify.backend.domain.valueobject.Email("a@b.com"))
                .authProvider(com.pomodify.backend.domain.enums.AuthProvider.LOCAL)
                .build();

        when(userRepository.findUser(userId)).thenReturn(Optional.of(user));
        when(activityRepository.countActivities(userId, false, null)).thenReturn(3L);

        Activity act = user.createActivity("Test", null, null, null);

        // Completed yesterday and today for a 2-day streak
        PomodoroSession sYesterday = PomodoroSession.builder()
                .id(10L)
                .activity(act)
                .focusDuration(Duration.ofMinutes(25))
                .breakDuration(Duration.ofMinutes(5))
                .cyclesCompleted(4)
                .status(SessionStatus.COMPLETED)
                .completedAt(LocalDateTime.now(zone).minusDays(1))
                .build();

        PomodoroSession sToday = PomodoroSession.builder()
                .id(11L)
                .activity(act)
                .focusDuration(Duration.ofMinutes(25))
                .breakDuration(Duration.ofMinutes(5))
                .cyclesCompleted(2)
                .status(SessionStatus.COMPLETED)
                .completedAt(LocalDateTime.now(zone))
                .build();

        // Stubs: the service computes date ranges; we return matching lists regardless of boundaries
        when(sessionRepository.findCompletedByUserIdBetween(eq(userId), any(), any()))
                .thenReturn(List.of(sToday)) // first call (today)
                .thenReturn(List.of(sYesterday, sToday)); // second call (this week)

        when(sessionRepository.findCompletedByUserId(userId)).thenReturn(List.of(sYesterday, sToday));
        when(sessionRepository.findRecentCompletedByUserId(userId, 5)).thenReturn(List.of(sToday, sYesterday));
        DashboardCommand cmd = DashboardCommand.of(userId, zone);
        DashboardResult result = service.getDashboard(cmd);

        long focusPerCycle = Duration.ofMinutes(25).getSeconds();
        long todayFocus = 2 * focusPerCycle;
        long weekFocus = (2 + 4) * focusPerCycle;

        assertEquals(3L, result.getTotalActivities());
        assertEquals(2L, result.getTotalSessions());

        assertEquals(todayFocus, result.getFocusSecondsToday());
        assertEquals(weekFocus, result.getFocusSecondsThisWeek());
        assertEquals(weekFocus, result.getFocusSecondsAllTime());

        assertEquals(2, result.getCurrentStreak());
        assertEquals(2, result.getBestStreak());

        assertEquals(2, result.getRecentSessions().size());
        assertEquals(sToday.getId(), result.getRecentSessions().get(0).getId());
        assertEquals(sYesterday.getId(), result.getRecentSessions().get(1).getId());
    }
}
