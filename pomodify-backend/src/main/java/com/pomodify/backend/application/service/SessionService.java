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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SessionService {

    private final PomodoroSessionRepository sessionRepository;
    private final DomainHelper domainHelper;
    private final UserHelper userHelper;

    /* -------------------- CREATE -------------------- */
    @Transactional
    public SessionResult create(CreateSessionCommand command) {
        userHelper.getUserOrThrow(command.user()); // ensure user exists
        Activity activity = domainHelper.getActivityOrThrow(command.activityId(), command.user());

        SessionType type = SessionType.valueOf(command.sessionType().toUpperCase());
        Duration focus = Duration.ofMinutes(command.focusTimeInMinutes());
        Duration brk = Duration.ofMinutes(command.breakTimeInMinutes());
        Integer cycles = command.cycles() != null ? command.cycles() : 1;

        PomodoroSession session = PomodoroSession.create(activity, type, focus, brk, cycles, command.note());
        PomodoroSession saved = sessionRepository.save(session);
        log.info("Created session {} for activity {}", saved.getId(), activity.getId());
        return toResult(saved);
    }

    /* -------------------- GET -------------------- */
    public SessionResult get(GetSessionCommand command) {
        PomodoroSession session = domainHelper.getSessionOrThrow(command.sessionId(), command.user());
        return toResult(session);
    }

    public List<SessionResult> getAll(GetSessionsCommand command) {
        List<PomodoroSession> sessions;
        if (command.activityId() != null) {
            sessions = sessionRepository.findByActivityId(command.activityId());
            sessions = sessions.stream()
                    .filter(s -> Objects.equals(s.getActivity().getUser().getId(), command.user()))
                    .collect(Collectors.toList());
        } else {
            sessions = sessionRepository.findActiveByUserId(command.user());
        }

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
        session.startSession();
        PomodoroSession saved = sessionRepository.save(session);
        return toResult(saved);
    }

    @Transactional
    public SessionResult pause(PauseSessionCommand command) {
        PomodoroSession session = domainHelper.getSessionOrThrow(command.sessionId(), command.user());
        session.pauseSession();
        if (command.note() != null && !command.note().isBlank()) {
            session.setNote(command.note().trim());
        }
        PomodoroSession saved = sessionRepository.save(session);
        return toResult(saved);
    }

    @Transactional
    public SessionResult resume(ResumeSessionCommand command) {
        PomodoroSession session = domainHelper.getSessionOrThrow(command.sessionId(), command.user());
        session.resumeSession();
        PomodoroSession saved = sessionRepository.save(session);
        return toResult(saved);
    }

    @Transactional
    public SessionResult stop(StopSessionCommand command) {
        PomodoroSession session = domainHelper.getSessionOrThrow(command.sessionId(), command.user());
        session.stopSession();
        if (command.note() != null && !command.note().isBlank()) {
            session.setNote(command.note().trim());
        }
        PomodoroSession saved = sessionRepository.save(session);
        return toResult(saved);
    }

    @Transactional
    public SessionResult cancel(CancelSessionCommand command) {
        PomodoroSession session = domainHelper.getSessionOrThrow(command.sessionId(), command.user());
        session.cancelSession();
        PomodoroSession saved = sessionRepository.save(session);
        return toResult(saved);
    }

    @Transactional
    public SessionResult completePhase(CompletePhaseCommand command) {
        PomodoroSession session = domainHelper.getSessionOrThrow(command.sessionId(), command.user());
        session.completeCyclePhase();
        if (command.note() != null && !command.note().isBlank()) {
            session.setNote(command.note().trim());
        }
        PomodoroSession saved = sessionRepository.save(session);
        return toResult(saved);
    }

    @Transactional
    public SessionResult finish(FinishSessionCommand command) {
        PomodoroSession session = domainHelper.getSessionOrThrow(command.sessionId(), command.user());
        // For freestyle: if currently in BREAK, count the current cycle as completed; if in FOCUS, do not.
        if (SessionType.FREESTYLE.equals(session.getSessionType())) {
            if (session.getCurrentPhase() != null && session.getCurrentPhase().name().equalsIgnoreCase("BREAK")) {
                session.setCyclesCompleted((session.getCyclesCompleted() != null ? session.getCyclesCompleted() : 0) + 1);
            }
        }
        session.completeSession();
        if (command.note() != null && !command.note().isBlank()) {
            session.setNote(command.note().trim());
        }
        PomodoroSession saved = sessionRepository.save(session);
        return toResult(saved);
    }

    @Transactional
    public SessionResult updateNote(UpdateSessionNoteCommand command) {
        PomodoroSession session = domainHelper.getSessionOrThrow(command.sessionId(), command.user());
        session.setNote(command.note() != null && !command.note().isBlank() ? command.note().trim() : null);
        PomodoroSession saved = sessionRepository.save(session);
        return toResult(saved);
    }

    /* -------------------- DELETE -------------------- */
    @Transactional
    public void delete(DeleteSessionCommand command) {
        PomodoroSession session = domainHelper.getSessionOrThrow(command.sessionId(), command.user());
        sessionRepository.delete(session);
        log.info("Soft deleted session {}", command.sessionId());
    }

    /* -------------------- MAPPER -------------------- */
    private SessionResult toResult(PomodoroSession s) {
        int cycles;
        int totalMinutes;

        if (SessionType.FREESTYLE.equals(s.getSessionType())) {
            int completed = s.getCyclesCompleted() != null ? s.getCyclesCompleted() : 0;
            cycles = completed; // FREESTYLE: cycles represent completed rounds
            totalMinutes = completed * (int)(s.getFocusDuration().toMinutes() + s.getBreakDuration().toMinutes());
            // Note: by spec, partial focus time is not added on finish; only add an extra cycle if finishing during BREAK (handled above)
        } else {
            cycles = s.getTotalCycles() != null ? s.getTotalCycles() : 1;
            totalMinutes = (int) (s.getFocusDuration().toMinutes() + s.getBreakDuration().toMinutes()) * cycles;
        }
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
                .note(s.getNote())
                .startedAt(s.getStartedAt())
                .completedAt(s.getCompletedAt())
                .createdAt(s.getCreatedAt())
                .build();
    }
}
