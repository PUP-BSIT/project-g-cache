package com.pomodify.backend.application.service;

import com.pomodify.backend.domain.enums.CyclePhase;
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
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PhaseNotificationScheduler {

    private final PomodoroSessionRepository sessionRepository;
    private final PushNotificationService pushNotificationService;

    /**
     * Runs every 30 seconds to check for sessions that need phase completion notifications.
     */
    @Scheduled(fixedRate = 30000)
    @Transactional
    public void checkAndSendPhaseNotifications() {
        LocalDateTime now = LocalDateTime.now();
        
        List<PomodoroSession> sessions = sessionRepository.findSessionsNeedingNotification(now);
        
        if (sessions.isEmpty()) {
            return;
        }
        
        log.info("Found {} sessions needing phase notification", sessions.size());
        
        for (PomodoroSession session : sessions) {
            try {
                sendPhaseNotification(session);
                session.setPhaseNotified(true);
                sessionRepository.save(session);
                
                log.info("Sent phase notification for session {} (user: {})", 
                    session.getId(), session.getActivity().getUser().getId());
            } catch (Exception e) {
                log.error("Failed to send notification for session {}: {}", 
                    session.getId(), e.getMessage());
            }
        }
    }

    private void sendPhaseNotification(PomodoroSession session) {
        Long userId = session.getActivity().getUser().getId();
        CyclePhase phase = session.getCurrentPhase();
        int focusMinutes = (int) session.getFocusDuration().toMinutes();
        int breakMinutes = (int) session.getBreakDuration().toMinutes();
        
        String title;
        String body;
        
        if (phase == CyclePhase.FOCUS) {
            // Focus phase just ended → transitioning to break
            title = "☕ It's Break Time!";
            body = String.format("%d minutes of focus completed", focusMinutes);
        } else {
            // Break phase just ended → transitioning to focus
            title = "🔥 Focus Now!";
            body = "Break is done. Time to get back to work!";
        }
        
        try {
            pushNotificationService.sendNotificationToUser(userId, title, body);
        } catch (IllegalStateException e) {
            log.debug("Notification skipped for user {} - disabled in settings", userId);
        }
    }
}
