package com.pomodify.backend.domain;

import com.pomodify.backend.domain.enums.CyclePhase;
import com.pomodify.backend.domain.enums.SessionStatus;
import com.pomodify.backend.domain.enums.SessionType;
import com.pomodify.backend.domain.model.Activity;
import com.pomodify.backend.domain.model.PomodoroSession;
import com.pomodify.backend.domain.model.User;
import com.pomodify.backend.domain.valueobject.Email;
import com.pomodify.backend.domain.enums.AuthProvider;
import net.jqwik.api.*;
import net.jqwik.api.constraints.IntRange;

import java.time.Duration;

/**
 * Property-based tests for PomodoroSession long break scheduling.
 * 
 * Feature: freestyle-pomodoro-settings
 * Property 5: Long Break Scheduling
 * Validates: Requirements 4.4, 4.5, 5.1
 * 
 * For any Freestyle session with long break interval N, after completing N focus sessions,
 * the next break SHALL be a long break, and this pattern SHALL repeat indefinitely.
 */
class PomodoroSessionLongBreakSchedulingPropertyTest {

    private User createTestUser() {
        return User.builder()
                .firstName("Test")
                .lastName("User")
                .passwordHash("hash")
                .email(new Email("test@example.com"))
                .authProvider(AuthProvider.LOCAL)
                .build();
    }

    private Activity createTestActivity() {
        User user = createTestUser();
        return user.createActivity("Test Activity", null, null, null);
    }

    private PomodoroSession createFreestyleSession(int longBreakIntervalCycles) {
        return PomodoroSession.builder()
                .activity(createTestActivity())
                .sessionType(SessionType.FREESTYLE)
                .status(SessionStatus.NOT_STARTED)
                .currentPhase(CyclePhase.FOCUS)
                .focusDuration(Duration.ofMinutes(25))
                .breakDuration(Duration.ofMinutes(5))
                .longBreakDuration(Duration.ofMinutes(15))
                .longBreakIntervalCycles(longBreakIntervalCycles)
                .cyclesCompleted(0)
                .build();
    }

    /**
     * Property 5: Long Break Scheduling
     * 
     * For any valid long break interval N (2-10), when a session completes exactly N-1 cycles
     * and then completes a focus phase, the next phase SHALL be a LONG_BREAK.
     */
    @Property(tries = 100)
    @Label("Property 5: Long break triggers at correct interval")
    void longBreakTriggersAtCorrectInterval(@ForAll @IntRange(min = 2, max = 10) int intervalCycles) {
        PomodoroSession session = createFreestyleSession(intervalCycles);
        session.startSession();
        
        // Complete (intervalCycles - 1) full cycles
        // Each cycle = FOCUS -> BREAK
        for (int i = 0; i < intervalCycles - 1; i++) {
            // Complete focus phase -> should go to BREAK
            session.completeCyclePhaseAndContinue();
            assertPhase(session, CyclePhase.BREAK, 
                    "After focus %d, should be in BREAK", i + 1);
            
            // Complete break phase -> should go to FOCUS
            session.completeCyclePhaseAndContinue();
            assertPhase(session, CyclePhase.FOCUS, 
                    "After break %d, should be in FOCUS", i + 1);
        }
        
        // Now complete the Nth focus phase -> should trigger LONG_BREAK
        session.completeCyclePhaseAndContinue();
        assertPhase(session, CyclePhase.LONG_BREAK, 
                "After %d focus phases, should be in LONG_BREAK", intervalCycles);
    }

    /**
     * Property 5: Long Break Scheduling (Pattern Repeats)
     * 
     * For any valid long break interval N, after a long break completes,
     * the pattern SHALL restart and the next long break SHALL occur after another N cycles.
     */
    @Property(tries = 100)
    @Label("Property 5: Long break pattern repeats after long break")
    void longBreakPatternRepeatsAfterLongBreak(@ForAll @IntRange(min = 2, max = 5) int intervalCycles) {
        PomodoroSession session = createFreestyleSession(intervalCycles);
        session.startSession();
        
        // Complete first full pattern (N cycles + long break)
        for (int i = 0; i < intervalCycles - 1; i++) {
            session.completeCyclePhaseAndContinue(); // FOCUS -> BREAK
            session.completeCyclePhaseAndContinue(); // BREAK -> FOCUS
        }
        session.completeCyclePhaseAndContinue(); // Nth FOCUS -> LONG_BREAK
        assertPhase(session, CyclePhase.LONG_BREAK, "Should be in first LONG_BREAK");
        
        // Complete long break -> should go back to FOCUS
        session.completeCyclePhaseAndContinue();
        assertPhase(session, CyclePhase.FOCUS, "After LONG_BREAK, should be in FOCUS");
        
        // Complete another (N-1) cycles
        for (int i = 0; i < intervalCycles - 1; i++) {
            session.completeCyclePhaseAndContinue(); // FOCUS -> BREAK
            session.completeCyclePhaseAndContinue(); // BREAK -> FOCUS
        }
        
        // Complete the Nth focus phase again -> should trigger another LONG_BREAK
        session.completeCyclePhaseAndContinue();
        assertPhase(session, CyclePhase.LONG_BREAK, 
                "After another %d focus phases, should be in second LONG_BREAK", intervalCycles);
    }

    /**
     * Property 5: Non-interval cycles should NOT trigger long break
     * 
     * For any cycle count that is not a multiple of the interval,
     * completing a focus phase SHALL result in a regular BREAK, not LONG_BREAK.
     */
    @Property(tries = 100)
    @Label("Property 5: Non-interval cycles trigger regular break")
    void nonIntervalCyclesTriggerRegularBreak(
            @ForAll @IntRange(min = 2, max = 10) int intervalCycles,
            @ForAll @IntRange(min = 1, max = 9) int cycleOffset) {
        
        // Skip if cycleOffset would make it a multiple of intervalCycles
        if (cycleOffset % intervalCycles == 0) {
            return;
        }
        
        PomodoroSession session = createFreestyleSession(intervalCycles);
        session.startSession();
        
        // Complete (cycleOffset - 1) full cycles to get to the right position
        for (int i = 0; i < cycleOffset - 1; i++) {
            session.completeCyclePhaseAndContinue(); // FOCUS -> BREAK
            session.completeCyclePhaseAndContinue(); // BREAK -> FOCUS
        }
        
        // Complete focus phase -> should be regular BREAK (not LONG_BREAK)
        session.completeCyclePhaseAndContinue();
        
        // If cycleOffset is not a multiple of intervalCycles, should be regular BREAK
        if (cycleOffset % intervalCycles != 0) {
            assertPhase(session, CyclePhase.BREAK, 
                    "After %d focus phases (interval=%d), should be in regular BREAK", 
                    cycleOffset, intervalCycles);
        }
    }

    /**
     * Property 5: Session without long break interval cycles should not trigger long break
     * 
     * When longBreakIntervalCycles is null, completing focus phases SHALL always
     * result in regular BREAK phases.
     */
    @Property(tries = 100)
    @Label("Property 5: No long break when interval cycles is null")
    void noLongBreakWhenIntervalCyclesIsNull(@ForAll @IntRange(min = 1, max = 20) int focusPhases) {
        PomodoroSession session = PomodoroSession.builder()
                .activity(createTestActivity())
                .sessionType(SessionType.FREESTYLE)
                .status(SessionStatus.NOT_STARTED)
                .currentPhase(CyclePhase.FOCUS)
                .focusDuration(Duration.ofMinutes(25))
                .breakDuration(Duration.ofMinutes(5))
                .longBreakDuration(Duration.ofMinutes(15))
                .longBreakIntervalCycles(null) // No cycle-based interval
                .cyclesCompleted(0)
                .build();
        
        session.startSession();
        
        // Complete multiple focus phases
        for (int i = 0; i < focusPhases; i++) {
            session.completeCyclePhaseAndContinue(); // FOCUS -> BREAK (never LONG_BREAK)
            
            // Should never be LONG_BREAK when longBreakIntervalCycles is null
            // (and longBreakInterval Duration is also null)
            CyclePhase phase = session.getCurrentPhase();
            if (phase == CyclePhase.LONG_BREAK) {
                throw new AssertionError(String.format(
                        "Should not trigger LONG_BREAK when longBreakIntervalCycles is null (focus phase %d)", 
                        i + 1));
            }
            
            if (phase == CyclePhase.BREAK) {
                session.completeCyclePhaseAndContinue(); // BREAK -> FOCUS
            }
        }
    }

    private void assertPhase(PomodoroSession session, CyclePhase expected, String format, Object... args) {
        CyclePhase actual = session.getCurrentPhase();
        if (actual != expected) {
            throw new AssertionError(String.format(format, args) + 
                    String.format(" - expected %s but was %s", expected, actual));
        }
    }
}
