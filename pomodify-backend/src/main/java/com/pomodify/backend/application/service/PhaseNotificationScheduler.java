package com.pomodify.backend.application.service;

import com.pomodify.backend.domain.enums.CyclePhase;
import com.pomodify.backend.domain.enums.SessionStatus;
import com.pomodify.backend.domain.model.PomodoroSession;
import com.pomodify.backend.domain.repository.PomodoroSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Scheduled service that checks for completed phases and sends FCM push notifications.
 * This enables notifications even when the user has closed the browser,
 * as long as the timer was running (IN_PROGRESS) when they left.
 * 
 * When a phase completes:
 * 1. Sends push notification to user
 * 2. Sets session to PAUSED awaiting user action to start next phase
 * 3. Does NOT auto-advance to next phase - user must manually start next phase
 * 
 * This ensures users don't miss phases when they close the browser.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PhaseNotificationScheduler {

    private final PomodoroSessionRepository sessionRepository;
    private final PushNotificationService pushNotificationService;
    private final BadgeService badgeService;

    /**
     * Runs every 10 seconds to check for sessions that need phase completion notifications.
     * Reduced from 30 seconds for better responsiveness when user is away from the app.
     */
    @Scheduled(fixedRate = 10000)
    @Transactional
    public void checkAndSendPhaseNotifications() {
        LocalDateTime now = LocalDateTime.now();
        
        log.info("🔔 Scheduler running at {} - checking for sessions needing notification", now);
        
        // Debug: Log the query parameters
        log.debug("🔔 Query: status=IN_PROGRESS, phaseEndTime <= {}, phaseNotified=false", now);
        
        List<PomodoroSession> sessions = sessionRepository.findSessionsNeedingNotification(now);
        
        if (sessions.isEmpty()) {
            log.debug("🔔 No sessions needing notification at {}", now);
            return;
        }
        
        log.info("🔔 Found {} sessions needing phase notification at {}", sessions.size(), now);
        
        for (PomodoroSession session : sessions) {
            try {
                // Double-check that phaseNotified is still false (prevent race conditions)
                if (Boolean.TRUE.equals(session.getPhaseNotified())) {
                    log.info("🔔 Session {} already notified, skipping", session.getId());
                    continue;
                }
                
                log.info("🔔 Processing session {} - phase: {}, phaseEndTime: {}, user: {}", 
                    session.getId(), 
                    session.getCurrentPhase(),
                    session.getPhaseEndTime(),
                    session.getActivity().getUser().getId());
                processPhaseCompletion(session);
            } catch (Exception e) {
                log.error("❌ Failed to process phase completion for session {}: {}", 
                    session.getId(), e.getMessage(), e);
            }
        }
    }

    /**
     * Process a session whose phase has completed:
     * 1. Mark phase as notified FIRST (prevents duplicate notifications)
     * 2. Change status to PAUSED immediately to prevent race conditions
     * 3. Save immediately
     * 4. Send notification
     * 5. Advance to next phase and set remaining time
     * 
     * Unlike the old behavior, we do NOT auto-advance to the next phase.
     * The user must manually start the next phase when they return to the app.
     * This prevents the session from running through all phases while the user is away.
     */
    private void processPhaseCompletion(PomodoroSession session) {
        Long userId = session.getActivity().getUser().getId();
        CyclePhase completedPhase = session.getCurrentPhase();
        
        log.info("Processing phase completion for session {} - completing {} phase", 
            session.getId(), completedPhase);
        
        // CRITICAL: Mark as notified AND change status to PAUSED FIRST
        // This ensures that even if the scheduler runs again before we finish processing,
        // the session won't be picked up again (query requires IN_PROGRESS status)
        session.setPhaseNotified(true);
        session.setPhaseEndTime(null); // Clear phase end time since phase is complete
        session.setStatus(SessionStatus.PAUSED); // Change status immediately to prevent race conditions
        sessionRepository.save(session);
        
        log.info("Session {} marked as PAUSED and notified to prevent duplicate processing", session.getId());
        
        // Send notification for completed phase
        sendPhaseNotification(session, completedPhase);
        
        // Now advance to next phase
        // The user must manually start the next phase when they return
        advanceToNextPhase(session, completedPhase);
        
        // Check if session just completed
        if (session.getStatus() == SessionStatus.COMPLETED) {
            int cyclesCompleted = session.getCyclesCompleted() != null ? session.getCyclesCompleted() : 0;
            log.info("Session {} completed with {} cycles", session.getId(), cyclesCompleted);
            sendSessionCompletionNotification(userId, cyclesCompleted);
            
            // Award badges if eligible
            try {
                badgeService.awardBadgesIfEligible(userId);
            } catch (Exception e) {
                log.warn("Failed to award badges for user {}: {}", userId, e.getMessage());
            }
        } else {
            log.info("Session {} paused at {} phase, waiting for user to start next phase", 
                session.getId(), session.getCurrentPhase());
        }
        
        sessionRepository.save(session);
        
        log.info("Saved session {} (user: {}, new phase: {}, status: {}, phaseEndTime: {}, remainingSecondsAtPause: {})", 
            session.getId(), userId, session.getCurrentPhase(), session.getStatus(), 
            session.getPhaseEndTime(), session.getRemainingSecondsAtPause());
    }
    
    /**
     * Advance session to the next phase without starting the timer.
     * Sets the remaining time to the full duration of the next phase.
     */
    private void advanceToNextPhase(PomodoroSession session, CyclePhase completedPhase) {
        // Determine next phase
        CyclePhase nextPhase;
        if (completedPhase == CyclePhase.FOCUS) {
            // Check if should trigger long break
            if (shouldTriggerLongBreak(session)) {
                nextPhase = CyclePhase.LONG_BREAK;
                log.info("advanceToNextPhase: Transitioning to LONG_BREAK for session {}", session.getId());
            } else {
                nextPhase = CyclePhase.BREAK;
                log.info("advanceToNextPhase: Transitioning to BREAK for session {}", session.getId());
            }
        } else {
            // After any break, go back to focus and increment cycle count
            nextPhase = CyclePhase.FOCUS;
            session.setCyclesCompleted((session.getCyclesCompleted() != null ? session.getCyclesCompleted() : 0) + 1);
            log.info("advanceToNextPhase: Transitioning to FOCUS for session {}, cyclesCompleted now={}", 
                session.getId(), session.getCyclesCompleted());
        }
        
        session.setCurrentPhase(nextPhase);
        session.setPhaseStartedAt(null);
        session.setPhaseEndTime(null);
        session.setPhaseNotified(false); // Reset for next phase
        session.setTotalPausedDurationSeconds(0L);
        
        // Set remaining time to full duration of the next phase
        long nextPhaseDurationSeconds = getNextPhaseDurationSeconds(session, nextPhase);
        session.setRemainingSecondsAtPause(nextPhaseDurationSeconds);
        log.info("advanceToNextPhase: Set remainingSecondsAtPause={} for phase {} (session {})", 
            nextPhaseDurationSeconds, nextPhase, session.getId());
        
        // Check if session is now complete (only for Classic sessions)
        // Freestyle sessions never auto-complete - they run until user manually completes
        Integer totalCycles = session.getTotalCycles();
        Integer cyclesCompleted = session.getCyclesCompleted();
        if (session.getSessionType() != com.pomodify.backend.domain.enums.SessionType.FREESTYLE &&
            totalCycles != null && cyclesCompleted != null && cyclesCompleted >= totalCycles) {
            session.setStatus(SessionStatus.COMPLETED);
            session.setCompletedAt(java.time.LocalDateTime.now());
            session.setRemainingSecondsAtPause(null);
            log.info("advanceToNextPhase: Session {} marked as COMPLETED (Classic session reached {} cycles)", 
                session.getId(), cyclesCompleted);
        }
        // Status remains PAUSED (already set before this method is called)
    }
    
    /**
     * Check if a long break should be triggered based on session settings.
     * Uses cycle-based interval (longBreakIntervalCycles) if available,
     * otherwise falls back to time-based interval for backward compatibility.
     */
    private boolean shouldTriggerLongBreak(PomodoroSession session) {
        if (session.getLongBreakDuration() == null) {
            log.debug("shouldTriggerLongBreak: longBreakDuration is null, returning false");
            return false;
        }
        
        int cyclesCompleted = session.getCyclesCompleted() != null ? session.getCyclesCompleted() : 0;
        
        // Use cycle-based interval if available (new approach)
        if (session.getLongBreakIntervalCycles() != null) {
            boolean shouldTrigger = (cyclesCompleted + 1) % session.getLongBreakIntervalCycles() == 0;
            log.info("shouldTriggerLongBreak: cyclesCompleted={}, intervalCycles={}, shouldTrigger={}", 
                cyclesCompleted, session.getLongBreakIntervalCycles(), shouldTrigger);
            return shouldTrigger;
        }
        
        // Fallback to time-based interval for backward compatibility
        if (session.getLongBreakInterval() == null) {
            log.debug("shouldTriggerLongBreak: both intervalCycles and longBreakInterval are null, returning false");
            return false;
        }
        
        long cycleMinutes = session.getFocusDuration().toMinutes() + session.getBreakDuration().toMinutes();
        long cyclesPerLongBreak = session.getLongBreakInterval().toMinutes() / cycleMinutes;
        if (cyclesPerLongBreak < 1) cyclesPerLongBreak = 1;
        
        boolean shouldTrigger = (cyclesCompleted + 1) % cyclesPerLongBreak == 0;
        log.info("shouldTriggerLongBreak (time-based fallback): cyclesCompleted={}, cyclesPerLongBreak={}, shouldTrigger={}", 
            cyclesCompleted, cyclesPerLongBreak, shouldTrigger);
        return shouldTrigger;
    }
    
    /**
     * Get the duration in seconds for the given phase.
     */
    private long getNextPhaseDurationSeconds(PomodoroSession session, CyclePhase phase) {
        if (phase == CyclePhase.FOCUS) {
            return session.getFocusDuration().getSeconds();
        } else if (phase == CyclePhase.LONG_BREAK && session.getLongBreakDuration() != null) {
            return session.getLongBreakDuration().getSeconds();
        } else {
            return session.getBreakDuration().getSeconds();
        }
    }

    private void sendPhaseNotification(PomodoroSession session, CyclePhase completedPhase) {
        Long userId = session.getActivity().getUser().getId();
        int focusMinutes = (int) session.getFocusDuration().toMinutes();
        int breakMinutes = (int) session.getBreakDuration().toMinutes();
        int longBreakMinutes = session.getLongBreakDuration() != null 
            ? (int) session.getLongBreakDuration().toMinutes() 
            : breakMinutes;
        
        String title;
        String body;
        
        if (completedPhase == CyclePhase.FOCUS) {
            // Focus phase just ended → transitioning to break or long break
            // Check what the next phase will be
            boolean isLongBreak = shouldTriggerLongBreak(session);
            if (isLongBreak) {
                title = "☕ Focus Complete - Long Break Time!";
                body = String.format("Great work! %d minutes of focus done. Time for a %d minute long break.", 
                    focusMinutes, longBreakMinutes);
            } else {
                title = "☕ Focus Complete - Take a Break!";
                body = String.format("Great work! %d minutes of focus done. Time for a %d minute break.", 
                    focusMinutes, breakMinutes);
            }
        } else if (completedPhase == CyclePhase.LONG_BREAK) {
            // Long break ended → back to focus
            title = "🔥 Long Break Over - Back to Focus!";
            body = "Feeling refreshed? Let's get back to work!";
        } else {
            // Regular break ended → back to focus
            title = "🔥 Break Over - Time to Focus!";
            body = String.format("Break complete. Ready for %d minutes of focus?", focusMinutes);
        }
        
        try {
            pushNotificationService.sendNotificationToUser(userId, title, body);
        } catch (IllegalStateException e) {
            log.debug("Notification skipped for user {} - disabled in settings", userId);
        }
    }

    private void sendSessionCompletionNotification(Long userId, int cyclesCompleted) {
        String title = "🎉 Session Complete!";
        String body = String.format("Congratulations! You completed %d cycle%s. Great job staying focused!", 
            cyclesCompleted, cyclesCompleted == 1 ? "" : "s");
        
        try {
            pushNotificationService.sendNotificationToUser(userId, title, body);
        } catch (IllegalStateException e) {
            log.debug("Completion notification skipped for user {} - disabled in settings", userId);
        }
    }
}
