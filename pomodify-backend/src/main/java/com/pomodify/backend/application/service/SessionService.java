package com.pomodify.backend.application.service;

import com.pomodify.backend.application.command.session.*;
import com.pomodify.backend.application.helper.DomainHelper;
import com.pomodify.backend.application.helper.UserHelper;
import com.pomodify.backend.application.result.SessionResult;
import com.pomodify.backend.domain.enums.SessionStatus;
import com.pomodify.backend.domain.enums.SessionType;
import com.pomodify.backend.domain.model.Activity;
import com.pomodify.backend.domain.model.PomodoroSession;
import com.pomodify.backend.domain.repository.PomodoroSessionRepository;
import com.pomodify.backend.domain.model.SessionNote;
import com.pomodify.backend.domain.model.SessionTodoItem;
import com.pomodify.backend.presentation.dto.note.SessionTodoItemDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SessionService {

    private final PomodoroSessionRepository sessionRepository;
    private final DomainHelper domainHelper;
    private final UserHelper userHelper;
    private final PushNotificationService pushNotificationService;
    private final com.pomodify.backend.application.service.BadgeService badgeService;

    /* -------------------- CREATE -------------------- */
    @Transactional
    public SessionResult create(CreateSessionCommand command) {
        userHelper.getUserOrThrow(command.user()); // ensure user exists
        Activity activity = domainHelper.getActivityOrThrow(command.activityId(), command.user());

        SessionType type = SessionType.valueOf(command.sessionType().toUpperCase());
        Duration focus = Duration.ofMinutes(command.focusTimeInMinutes());
        Duration brk = Duration.ofMinutes(command.breakTimeInMinutes());
        
        // For Freestyle sessions, cycles should be null (unlimited)
        // For Classic sessions, default to 1 if not provided
        Integer cycles;
        if (type == SessionType.FREESTYLE) {
            cycles = null; // Freestyle sessions are unlimited
        } else {
            cycles = command.cycles() != null ? command.cycles() : 1;
        }
        
        // Calculate total minutes for long break eligibility (only for Classic sessions)
        long totalMinutes = cycles != null ? (focus.toMinutes() + brk.toMinutes()) * cycles : 0;
        Duration longBreak = null;
        Duration interval = null;
        Integer intervalCycles = null;
        
        // For Freestyle sessions, always allow long break settings
        if (type == SessionType.FREESTYLE) {
            if (command.longBreakTimeInMinutes() != null) {
                longBreak = Duration.ofMinutes(command.longBreakTimeInMinutes());
            } else {
                longBreak = Duration.ofMinutes(15); // Default long break for Freestyle
            }
            intervalCycles = command.longBreakIntervalInCycles() != null ? command.longBreakIntervalInCycles() : 4;
        } else if (command.enableLongBreak() != null && command.enableLongBreak() && totalMinutes > 180) {
            // Use cycle-based interval if provided, otherwise fall back to time-based
            if (command.longBreakIntervalInCycles() != null) {
                intervalCycles = command.longBreakIntervalInCycles();
            } else if (command.longBreakIntervalInMinutes() != null) {
                if (!(command.longBreakIntervalInMinutes() == 180
                    || command.longBreakIntervalInMinutes() == 210
                    || command.longBreakIntervalInMinutes() == 240)) {
                    throw new IllegalArgumentException("Long break interval must be 180, 210, or 240 minutes");
                }
                interval = Duration.ofMinutes(command.longBreakIntervalInMinutes());
            }
            if (command.longBreakTimeInMinutes() != null) {
                longBreak = Duration.ofMinutes(command.longBreakTimeInMinutes());
            }
        }

        PomodoroSession session = activity.createSession(type, focus, brk, cycles, longBreak, interval, intervalCycles, command.note());
        
        PomodoroSession saved = sessionRepository.save(session);
        log.info("Created session {} for activity {}", saved.getId(), activity.getId());
        return toResult(saved);
    }

    /* -------------------- GET -------------------- */
    @Transactional(readOnly = true)
    public SessionResult get(GetSessionCommand command) {
        PomodoroSession session = domainHelper.getSessionOrThrow(command.sessionId(), command.user());
        session.evaluateAbandonedIfExpired();
        sessionRepository.save(session);
        return toResult(session);
    }

    @Transactional
    public List<SessionResult> getAll(GetSessionsCommand command) {
        List<PomodoroSession> sessions;
        Boolean fetchDeleted = command.deleted();

        if (command.activityId() != null) {
            // Use the repository method that fetches by activity and user to avoid lazy loading issues
            sessions = sessionRepository.findByActivityIdAndUserId(command.activityId(), command.user());
        } else {
            if (Boolean.TRUE.equals(fetchDeleted)) {
                sessions = sessionRepository.findByUserId(command.user());
            } else {
                sessions = sessionRepository.findActiveByUserId(command.user());
            }
        }

        if (fetchDeleted != null) {
            sessions = sessions.stream()
                    .filter(s -> s.isDeleted() == fetchDeleted)
                    .collect(Collectors.toList());
        }

        sessions.forEach(PomodoroSession::evaluateAbandonedIfExpired);
        sessions = sessions.stream().map(sessionRepository::save).toList();

        if (command.status() != null) {
            sessions = sessions.stream()
                    .filter(s -> s.getStatus() != null && s.getStatus().name().equalsIgnoreCase(command.status()))
                    .collect(Collectors.toList());
        }

        return sessions.stream().map(this::toResult).toList();
    }

    /* -------------------- LIFECYCLE -------------------- */
    @Transactional
    public SessionResult start(StartSessionCommand command) {
        PomodoroSession session = domainHelper.getSessionOrThrow(command.sessionId(), command.user());
        Activity activity = domainHelper.getActivityOrThrow(session.getActivity().getId(), command.user());
        activity.startSession(command.sessionId());
        PomodoroSession saved = sessionRepository.save(session);
        return toResult(saved);
    }

    @Transactional
    public SessionResult pause(PauseSessionCommand command) {
        PomodoroSession session = domainHelper.getSessionOrThrow(command.sessionId(), command.user());
        Activity activity = domainHelper.getActivityOrThrow(session.getActivity().getId(), command.user());
        activity.pauseSession(command.sessionId(), command.note());
        PomodoroSession saved = sessionRepository.save(session);
        return toResult(saved);
    }

    @Transactional
    public SessionResult resume(ResumeSessionCommand command) {
        PomodoroSession session = domainHelper.getSessionOrThrow(command.sessionId(), command.user());
        Activity activity = domainHelper.getActivityOrThrow(session.getActivity().getId(), command.user());
        activity.resumeSession(command.sessionId());
        PomodoroSession saved = sessionRepository.save(session);
        return toResult(saved);
    }

    @Transactional
    public SessionResult stop(StopSessionCommand command) {
        PomodoroSession session = domainHelper.getSessionOrThrow(command.sessionId(), command.user());
        Activity activity = domainHelper.getActivityOrThrow(session.getActivity().getId(), command.user());
        session.stopSession();
        PomodoroSession saved = sessionRepository.save(session);
        return toResult(saved);
    }

    @Transactional
    public SessionResult completePhase(CompletePhaseCommand command) {
        PomodoroSession session = domainHelper.getSessionOrThrow(command.sessionId(), command.user());
        Activity activity = domainHelper.getActivityOrThrow(session.getActivity().getId(), command.user());
        
        // Check if the scheduler already processed this phase (session is PAUSED)
        // If so, just return the current state without processing again
        if (session.getStatus() == SessionStatus.PAUSED) {
            log.info("Session {} is already PAUSED - scheduler already processed phase completion", session.getId());
            return toResult(session);
        }
        
        // Check if the scheduler already processed this phase (phaseNotified = true)
        // If so, the notification was already sent - don't send another one
        boolean schedulerAlreadyNotified = Boolean.TRUE.equals(session.getPhaseNotified());
        
        // Store the current phase before transition
        String currentPhase = session.getCurrentPhase() != null ? session.getCurrentPhase().name() : null;
        
        // Complete the phase (this will transition to next phase)
        activity.completePhase(command.sessionId(), command.note());
        PomodoroSession saved = sessionRepository.save(session);
        
        // Only send notification if scheduler hasn't already sent one
        if (!schedulerAlreadyNotified) {
            String title = saved.getCurrentPhase() != null && saved.getCurrentPhase().name().equalsIgnoreCase("BREAK")
                ? "Focus ended — take a break"
                : "Break ended — back to focus";
            String body = saved.getCurrentPhase() != null && saved.getCurrentPhase().name().equalsIgnoreCase("FOCUS")
                ? "Cycles completed: " + (saved.getCyclesCompleted() != null ? saved.getCyclesCompleted() : 0)
                : "Stay mindful and recharge.";
            
            try {
                pushNotificationService.sendNotificationToUser(command.user(), title, body);
            } catch (Exception e) {
                log.warn("Failed to send phase completion notification for session {}: {}", session.getId(), e.getMessage());
            }
        } else {
            log.info("Skipping notification for session {} - scheduler already sent notification", session.getId());
        }
        
        // If session just became COMPLETED, send completion push (only if not already notified)
        if (saved.getStatus() != null && saved.getStatus().name().equalsIgnoreCase("COMPLETED")) {
            int completed = saved.getCyclesCompleted() != null ? saved.getCyclesCompleted() : 0;
            if (!schedulerAlreadyNotified) {
                try {
                    pushNotificationService.sendNotificationToUser(command.user(), "Session completed", "You completed " + completed + " cycle(s).");
                } catch (Exception e) {
                    log.warn("Failed to send session completion notification: {}", e.getMessage());
                }
            }
            // Award badges if eligible
            badgeService.awardBadgesIfEligible(command.user());
        }
        return toResult(saved);
    }

    @Transactional
    public SessionResult skipPhase(SkipPhaseCommand command) {
        PomodoroSession session = domainHelper.getSessionOrThrow(command.sessionId(), command.user());
        Activity activity = domainHelper.getActivityOrThrow(session.getActivity().getId(), command.user());
        session.skipPhase();
        PomodoroSession saved = sessionRepository.save(session);
        return toResult(saved);
    }

    @Transactional
    public SessionResult completeEarly(CompleteEarlyCommand command) {
        PomodoroSession session = domainHelper.getSessionOrThrow(command.sessionId(), command.user());
        session.completeEarly();
        PomodoroSession saved = sessionRepository.save(session);
        
        // Award badges if session was completed
        if (saved.getStatus() != null && saved.getStatus().name().equalsIgnoreCase("COMPLETED")) {
            badgeService.awardBadgesIfEligible(command.user());
        }
        
        return toResult(saved);
    }

    @Transactional
    public SessionResult resetSession(ResetSessionCommand command) {
        PomodoroSession session = domainHelper.getSessionOrThrow(command.sessionId(), command.user());
        session.resetSession();
        PomodoroSession saved = sessionRepository.save(session);
        return toResult(saved);
    }

        @Transactional
        public SessionResult updateSession(UpdateSessionCommand command) {
        PomodoroSession session = domainHelper.getSessionOrThrow(command.sessionId(), command.user());
        Activity activity = domainHelper.getActivityOrThrow(session.getActivity().getId(), command.user());

        // Enforce edit restriction: only allow updates when status is NOT_STARTED
        if (session.getStatus() != SessionStatus.NOT_STARTED) {
            throw new IllegalStateException("Cannot edit session while in progress, paused, completed, or abandoned");
        }

        SessionType newType = command.sessionType() != null
            ? SessionType.valueOf(command.sessionType().toUpperCase())
            : null;
        Duration newFocus = command.focusTimeInMinutes() != null
            ? Duration.ofMinutes(command.focusTimeInMinutes())
            : null;
        Duration newBreak = command.breakTimeInMinutes() != null
            ? Duration.ofMinutes(command.breakTimeInMinutes())
            : null;
        Integer newCycles = command.cycles();
        Duration newLongBreak = null;
        Duration newInterval = null;
        Integer newIntervalCycles = command.longBreakIntervalInCycles();
        
        if (command.enableLongBreak() != null) {
            if (Boolean.TRUE.equals(command.enableLongBreak())) {
                if (command.longBreakTimeInMinutes() != null) {
                    newLongBreak = Duration.ofMinutes(command.longBreakTimeInMinutes());
                } else {
                    newLongBreak = session.getLongBreakDuration();
                }
                if (command.longBreakIntervalInMinutes() != null) {
                    newInterval = Duration.ofMinutes(command.longBreakIntervalInMinutes());
                } else {
                    newInterval = session.getLongBreakInterval();
                }
                // Use cycle-based interval if provided
                if (newIntervalCycles == null) {
                    newIntervalCycles = session.getLongBreakIntervalCycles();
                }
            } else {
                newLongBreak = null;
                newInterval = null;
                newIntervalCycles = null;
            }
        }

        Duration effectiveFocus = newFocus != null ? newFocus : session.getFocusDuration();
        Duration effectiveBreak = newBreak != null ? newBreak : session.getBreakDuration();
        int effectiveCycles = newCycles != null ? newCycles : (session.getTotalCycles() != null ? session.getTotalCycles() : 1);
        long totalMinutes = (effectiveFocus.toMinutes() + effectiveBreak.toMinutes()) * effectiveCycles;

        if (totalMinutes <= 180) {
            // For Freestyle sessions, always allow long break settings since they're unlimited
            if (session.getSessionType() != SessionType.FREESTYLE) {
                newLongBreak = null;
                newInterval = null;
                newIntervalCycles = null;
            }
            // For Freestyle, keep the long break settings as-is
        } else if (command.enableLongBreak() != null && Boolean.TRUE.equals(command.enableLongBreak())) {
            // Only validate time-based interval if cycle-based is not provided
            if (newIntervalCycles == null) {
                Integer intervalMinutes = command.longBreakIntervalInMinutes();
                if (intervalMinutes == null
                    || !(intervalMinutes == 180 || intervalMinutes == 210 || intervalMinutes == 240)) {
                    throw new IllegalArgumentException("Long break interval must be 180, 210, or 240 minutes");
                }
                newInterval = Duration.ofMinutes(intervalMinutes);
            }
        }

        if (newBreak != null || newLongBreak != null || newInterval != null || newIntervalCycles != null) {
            session.validateBreaks(newBreak != null ? newBreak : session.getBreakDuration(),
                    newLongBreak != null ? newLongBreak : session.getLongBreakDuration(),
                    newInterval != null ? newInterval : session.getLongBreakInterval(),
                    newIntervalCycles != null ? newIntervalCycles : session.getLongBreakIntervalCycles());
        }

        session.updateSettings(newType, newFocus, newBreak, newCycles);
        session.setLongBreakDuration(newLongBreak != null ? newLongBreak : session.getLongBreakDuration());
        session.setLongBreakInterval(newInterval != null ? newInterval : session.getLongBreakInterval());
        session.setLongBreakIntervalCycles(newIntervalCycles != null ? newIntervalCycles : session.getLongBreakIntervalCycles());
        PomodoroSession saved = sessionRepository.save(session);
        return toResult(saved);
        }

    @Transactional
    public SessionResult updateNote(UpdateSessionNoteCommand command) {
        PomodoroSession session = domainHelper.getSessionOrThrow(command.sessionId(), command.user());
        com.pomodify.backend.presentation.mapper.SessionNoteMapper.applyDtoToSession(session, command.note());
        PomodoroSession saved = sessionRepository.save(session);
        return toResult(saved);
    }

    @Transactional
    public SessionResult toggleTodoItem(Long userId, Long sessionId, Long itemId) {
        PomodoroSession session = domainHelper.getSessionOrThrow(sessionId, userId);
        SessionNote note = session.getNote();
        if (note == null || note.getItems() == null) {
            throw new IllegalArgumentException("No checklist items found for this session");
        }
        SessionTodoItem item = note.getItems().stream()
                .filter(i -> itemId.equals(i.getId()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Checklist item not found"));
        item.setDone(!item.isDone());
        PomodoroSession saved = sessionRepository.save(session);
        return toResult(saved);
    }

    @Transactional
    public SessionResult patchTodoItem(Long userId, Long sessionId, Long itemId, SessionTodoItemDto patch) {
        PomodoroSession session = domainHelper.getSessionOrThrow(sessionId, userId);
        SessionNote note = session.getNote();
        if (note == null || note.getItems() == null) {
            throw new IllegalArgumentException("No checklist items found for this session");
        }
        SessionTodoItem item = note.getItems().stream()
                .filter(i -> itemId.equals(i.getId()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Checklist item not found"));

        if (patch.text() != null) {
            item.setText(patch.text());
        }
        // we allow explicitly setting done; if you want only toggle, use toggleTodoItem
        item.setDone(patch.done());
        if (patch.orderIndex() != null) {
            item.setOrderIndex(patch.orderIndex());
        }

        PomodoroSession saved = sessionRepository.save(session);
        return toResult(saved);
    }

    @Transactional
    public SessionResult deleteTodoItem(Long userId, Long sessionId, Long itemId) {
        PomodoroSession session = domainHelper.getSessionOrThrow(sessionId, userId);
        SessionNote note = session.getNote();
        if (note == null || note.getItems() == null) {
            throw new IllegalArgumentException("No checklist items found for this session");
        }
        boolean removed = note.getItems().removeIf(i -> itemId.equals(i.getId()));
        if (!removed) {
            throw new IllegalArgumentException("Checklist item not found");
        }
        PomodoroSession saved = sessionRepository.save(session);
        return toResult(saved);
    }

    /* -------------------- DELETE -------------------- */
    @Transactional
    public void delete(DeleteSessionCommand command) {
        PomodoroSession session = domainHelper.getSessionOrThrow(command.sessionId(), command.user());
        session.delete();
        sessionRepository.save(session);
        log.info("Soft deleted session {} by setting isDeleted=true", command.sessionId());
    }

    /* -------------------- CLEAR ALL -------------------- */
    @Transactional
    public void clearAllSessions(Long userId) {
        userHelper.getUserOrThrow(userId); // ensure user exists
        sessionRepository.deleteAllByUserId(userId);
        log.info("Cleared all sessions for user {}", userId);
    }

    /* -------------------- MAPPER -------------------- */
    private SessionResult toResult(PomodoroSession s) {
        int cycles;
        int totalMinutes;

        // For both CLASSIC and FREESTYLE, use totalCycles as the cycle limit
        // FREESTYLE sessions now have a cycle limit based on the frequency setting
        cycles = s.getTotalCycles() != null ? s.getTotalCycles() : 1;
        totalMinutes = (int) (s.getFocusDuration().toMinutes() + s.getBreakDuration().toMinutes()) * cycles;
        
        long totalElapsedSeconds = s.calculateTotalElapsed().getSeconds();

        // Use the enhanced timer calculation from domain model
        long remainingPhaseSeconds = s.getRemainingPhaseSeconds();
        
        // Map long break settings
        Integer longBreakTimeInMinutes = s.getLongBreakDuration() != null 
                ? (int) s.getLongBreakDuration().toMinutes() 
                : null;
        Integer longBreakIntervalCycles = s.getLongBreakIntervalCycles();

        return SessionResult.builder()
                .id(s.getId())
                .activityId(s.getActivity() != null ? s.getActivity().getId() : null)
                .sessionType(s.getSessionType() != null ? s.getSessionType().name() : null)
                .status(s.getStatus() != null ? s.getStatus().name() : SessionStatus.NOT_STARTED.name())
                .currentPhase(s.getCurrentPhase() != null ? s.getCurrentPhase().name() : null)
                .focusTimeInMinutes((int) s.getFocusDuration().toMinutes())
                .breakTimeInMinutes((int) s.getBreakDuration().toMinutes())
                .cycles(cycles)
                .cyclesCompleted(s.getCyclesCompleted() != null ? s.getCyclesCompleted() : 0)
                .totalTimeInMinutes(totalMinutes)
                .totalElapsedSeconds(totalElapsedSeconds)
                .remainingPhaseSeconds(remainingPhaseSeconds)
                .longBreakTimeInMinutes(longBreakTimeInMinutes)
                .longBreakIntervalCycles(longBreakIntervalCycles)
                .note(com.pomodify.backend.presentation.mapper.SessionNoteMapper.toDto(s.getNote()))
                .startedAt(s.getStartedAt())
                .completedAt(s.getCompletedAt())
                .createdAt(s.getCreatedAt())
                .build();
    }
}
