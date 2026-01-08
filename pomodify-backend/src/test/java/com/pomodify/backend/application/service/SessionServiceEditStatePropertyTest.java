package com.pomodify.backend.application.service;

import com.pomodify.backend.application.command.session.UpdateSessionCommand;
import com.pomodify.backend.application.helper.DomainHelper;
import com.pomodify.backend.application.helper.UserHelper;
import com.pomodify.backend.domain.enums.SessionStatus;
import com.pomodify.backend.domain.enums.SessionType;
import com.pomodify.backend.domain.model.Activity;
import com.pomodify.backend.domain.model.PomodoroSession;
import com.pomodify.backend.domain.repository.PomodoroSessionRepository;
import net.jqwik.api.*;
import net.jqwik.api.constraints.IntRange;

import java.time.Duration;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Property-based tests for Session Service edit state restriction.
 * 
 * Feature: freestyle-pomodoro-settings
 * Property 7: Edit State Restriction
 * 
 * For any Freestyle session, parameter editing SHALL be enabled when status is NOT_STARTED
 * and SHALL be disabled when status is IN_PROGRESS, PAUSED, COMPLETED, or ABANDONED.
 * 
 * Validates: Requirements 8.1, 8.6
 */
class SessionServiceEditStatePropertyTest {

    private PomodoroSessionRepository sessionRepository;
    private DomainHelper domainHelper;
    private UserHelper userHelper;
    private PushNotificationService pushNotificationService;
    private BadgeService badgeService;
    private SessionService sessionService;

    void setUp() {
        sessionRepository = mock(PomodoroSessionRepository.class);
        domainHelper = mock(DomainHelper.class);
        userHelper = mock(UserHelper.class);
        pushNotificationService = mock(PushNotificationService.class);
        badgeService = mock(BadgeService.class);
        sessionService = new SessionService(sessionRepository, domainHelper, userHelper, pushNotificationService, badgeService);
    }

    private PomodoroSession createFreestyleSession(SessionStatus status) {
        Activity activity = mock(Activity.class);
        when(activity.getId()).thenReturn(1L);
        
        PomodoroSession session = PomodoroSession.builder()
                .id(1L)
                .activity(activity)
                .sessionType(SessionType.FREESTYLE)
                .status(status)
                .focusDuration(Duration.ofMinutes(25))
                .breakDuration(Duration.ofMinutes(5))
                .longBreakDuration(Duration.ofMinutes(15))
                .longBreakIntervalCycles(4)
                .cyclesCompleted(0)
                .build();
        return session;
    }

    // ========== Property 7: Edit State Restriction ==========
    // For any Freestyle session, parameter editing SHALL be enabled when status is NOT_STARTED
    // and SHALL be disabled when status is IN_PROGRESS, PAUSED, COMPLETED, or ABANDONED.

    @Property(tries = 100)
    @Label("Property 7: Editing should be allowed when session status is NOT_STARTED")
    void editingShouldBeAllowedWhenNotStarted(
            @ForAll @IntRange(min = 5, max = 90) int newFocusTime,
            @ForAll @IntRange(min = 2, max = 10) int newBreakTime,
            @ForAll @IntRange(min = 2, max = 10) int newIntervalCycles) {
        
        setUp();
        
        Long userId = 1L;
        Long sessionId = 1L;
        
        PomodoroSession session = createFreestyleSession(SessionStatus.NOT_STARTED);
        Activity activity = session.getActivity();
        
        when(domainHelper.getSessionOrThrow(sessionId, userId)).thenReturn(session);
        when(domainHelper.getActivityOrThrow(activity.getId(), userId)).thenReturn(activity);
        when(sessionRepository.save(any(PomodoroSession.class))).thenAnswer(inv -> inv.getArgument(0));
        
        UpdateSessionCommand command = UpdateSessionCommand.builder()
                .user(userId)
                .sessionId(sessionId)
                .focusTimeInMinutes(newFocusTime)
                .breakTimeInMinutes(newBreakTime)
                .longBreakIntervalInCycles(newIntervalCycles)
                .build();
        
        // Should not throw exception
        try {
            sessionService.updateSession(command);
        } catch (IllegalStateException e) {
            throw new AssertionError("Editing should be allowed when status is NOT_STARTED, but got: " + e.getMessage());
        }
    }

    @Property(tries = 100)
    @Label("Property 7: Editing should be rejected when session status is IN_PROGRESS")
    void editingShouldBeRejectedWhenInProgress(
            @ForAll @IntRange(min = 5, max = 90) int newFocusTime,
            @ForAll @IntRange(min = 2, max = 10) int newBreakTime) {
        
        setUp();
        
        Long userId = 1L;
        Long sessionId = 1L;
        
        PomodoroSession session = createFreestyleSession(SessionStatus.IN_PROGRESS);
        Activity activity = session.getActivity();
        
        when(domainHelper.getSessionOrThrow(sessionId, userId)).thenReturn(session);
        when(domainHelper.getActivityOrThrow(activity.getId(), userId)).thenReturn(activity);
        
        UpdateSessionCommand command = UpdateSessionCommand.builder()
                .user(userId)
                .sessionId(sessionId)
                .focusTimeInMinutes(newFocusTime)
                .breakTimeInMinutes(newBreakTime)
                .build();
        
        // Should throw IllegalStateException
        try {
            sessionService.updateSession(command);
            throw new AssertionError("Editing should be rejected when status is IN_PROGRESS");
        } catch (IllegalStateException e) {
            // Expected behavior
            if (!e.getMessage().contains("Cannot edit session")) {
                throw new AssertionError("Expected 'Cannot edit session' message, but got: " + e.getMessage());
            }
        }
    }

    @Property(tries = 100)
    @Label("Property 7: Editing should be rejected when session status is PAUSED")
    void editingShouldBeRejectedWhenPaused(
            @ForAll @IntRange(min = 5, max = 90) int newFocusTime,
            @ForAll @IntRange(min = 2, max = 10) int newBreakTime) {
        
        setUp();
        
        Long userId = 1L;
        Long sessionId = 1L;
        
        PomodoroSession session = createFreestyleSession(SessionStatus.PAUSED);
        Activity activity = session.getActivity();
        
        when(domainHelper.getSessionOrThrow(sessionId, userId)).thenReturn(session);
        when(domainHelper.getActivityOrThrow(activity.getId(), userId)).thenReturn(activity);
        
        UpdateSessionCommand command = UpdateSessionCommand.builder()
                .user(userId)
                .sessionId(sessionId)
                .focusTimeInMinutes(newFocusTime)
                .breakTimeInMinutes(newBreakTime)
                .build();
        
        // Should throw IllegalStateException
        try {
            sessionService.updateSession(command);
            throw new AssertionError("Editing should be rejected when status is PAUSED");
        } catch (IllegalStateException e) {
            // Expected behavior
            if (!e.getMessage().contains("Cannot edit session")) {
                throw new AssertionError("Expected 'Cannot edit session' message, but got: " + e.getMessage());
            }
        }
    }

    @Property(tries = 100)
    @Label("Property 7: Editing should be rejected when session status is COMPLETED")
    void editingShouldBeRejectedWhenCompleted(
            @ForAll @IntRange(min = 5, max = 90) int newFocusTime,
            @ForAll @IntRange(min = 2, max = 10) int newBreakTime) {
        
        setUp();
        
        Long userId = 1L;
        Long sessionId = 1L;
        
        PomodoroSession session = createFreestyleSession(SessionStatus.COMPLETED);
        Activity activity = session.getActivity();
        
        when(domainHelper.getSessionOrThrow(sessionId, userId)).thenReturn(session);
        when(domainHelper.getActivityOrThrow(activity.getId(), userId)).thenReturn(activity);
        
        UpdateSessionCommand command = UpdateSessionCommand.builder()
                .user(userId)
                .sessionId(sessionId)
                .focusTimeInMinutes(newFocusTime)
                .breakTimeInMinutes(newBreakTime)
                .build();
        
        // Should throw IllegalStateException
        try {
            sessionService.updateSession(command);
            throw new AssertionError("Editing should be rejected when status is COMPLETED");
        } catch (IllegalStateException e) {
            // Expected behavior
            if (!e.getMessage().contains("Cannot edit session")) {
                throw new AssertionError("Expected 'Cannot edit session' message, but got: " + e.getMessage());
            }
        }
    }

    @Property(tries = 100)
    @Label("Property 7: Editing should be rejected when session status is ABANDONED")
    void editingShouldBeRejectedWhenAbandoned(
            @ForAll @IntRange(min = 5, max = 90) int newFocusTime,
            @ForAll @IntRange(min = 2, max = 10) int newBreakTime) {
        
        setUp();
        
        Long userId = 1L;
        Long sessionId = 1L;
        
        PomodoroSession session = createFreestyleSession(SessionStatus.ABANDONED);
        Activity activity = session.getActivity();
        
        when(domainHelper.getSessionOrThrow(sessionId, userId)).thenReturn(session);
        when(domainHelper.getActivityOrThrow(activity.getId(), userId)).thenReturn(activity);
        
        UpdateSessionCommand command = UpdateSessionCommand.builder()
                .user(userId)
                .sessionId(sessionId)
                .focusTimeInMinutes(newFocusTime)
                .breakTimeInMinutes(newBreakTime)
                .build();
        
        // Should throw IllegalStateException
        try {
            sessionService.updateSession(command);
            throw new AssertionError("Editing should be rejected when status is ABANDONED");
        } catch (IllegalStateException e) {
            // Expected behavior
            if (!e.getMessage().contains("Cannot edit session")) {
                throw new AssertionError("Expected 'Cannot edit session' message, but got: " + e.getMessage());
            }
        }
    }

    @Property(tries = 100)
    @Label("Property 7: For any non-NOT_STARTED status, editing should be rejected")
    void editingShouldBeRejectedForAnyNonNotStartedStatus(
            @ForAll("nonNotStartedStatus") SessionStatus status,
            @ForAll @IntRange(min = 5, max = 90) int newFocusTime) {
        
        setUp();
        
        Long userId = 1L;
        Long sessionId = 1L;
        
        PomodoroSession session = createFreestyleSession(status);
        Activity activity = session.getActivity();
        
        when(domainHelper.getSessionOrThrow(sessionId, userId)).thenReturn(session);
        when(domainHelper.getActivityOrThrow(activity.getId(), userId)).thenReturn(activity);
        
        UpdateSessionCommand command = UpdateSessionCommand.builder()
                .user(userId)
                .sessionId(sessionId)
                .focusTimeInMinutes(newFocusTime)
                .build();
        
        // Should throw IllegalStateException for any non-NOT_STARTED status
        try {
            sessionService.updateSession(command);
            throw new AssertionError("Editing should be rejected when status is " + status);
        } catch (IllegalStateException e) {
            // Expected behavior
            if (!e.getMessage().contains("Cannot edit session")) {
                throw new AssertionError("Expected 'Cannot edit session' message for status " + status + ", but got: " + e.getMessage());
            }
        }
    }

    @Provide
    Arbitrary<SessionStatus> nonNotStartedStatus() {
        return Arbitraries.of(
                SessionStatus.IN_PROGRESS,
                SessionStatus.PAUSED,
                SessionStatus.COMPLETED,
                SessionStatus.ABANDONED
        );
    }
}
