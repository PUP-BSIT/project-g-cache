package com.pomodify.backend.infrastructure.repository.impl;

import com.pomodify.backend.domain.model.PomodoroSession;
import com.pomodify.backend.domain.repository.PomodoroSessionRepository;
import com.pomodify.backend.infrastructure.repository.spring.SpringPomodoroSessionJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.PageRequest;
import com.pomodify.backend.domain.enums.SessionStatus;

import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class PomodoroSessionRepositoryAdapter implements PomodoroSessionRepository {

    private final SpringPomodoroSessionJpaRepository springRepo;

    @Override
    public Optional<PomodoroSession> findById(Long id) {
        return springRepo.findById(id);
    }

    @Override
    public List<PomodoroSession> findByUserId(Long userId) {
        return springRepo.findByUserId(userId);
    }

    @Override
    public List<PomodoroSession> findActiveByUserId(Long userId) {
        return springRepo.findActiveByUserId(userId);
    }

    @Override
    public List<PomodoroSession> findByActivityId(Long activityId) {
        return springRepo.findByActivityId(activityId);
    }

    @Override
    public List<PomodoroSession> findByActivityIdAndUserId(Long activityId, Long userId) {
        return springRepo.findByActivityIdAndUserId(activityId, userId);
    }

    @Override
    public PomodoroSession save(PomodoroSession session) {
        return springRepo.save(session);
    }

    @Override
    public void delete(PomodoroSession session) {
        session.delete();
        springRepo.save(session);
    }

    @Override
    public boolean existsByIdAndUserId(Long id, Long userId) {
        return springRepo.existsByIdAndUserId(id, userId);
    }

    @Override
    public Optional<PomodoroSession> findByIdAndUserId(Long id, Long userId) {
        return springRepo.findByIdAndUserId(id, userId);
    }

    @Override
    public List<PomodoroSession> findCompletedByUserIdBetween(Long userId, java.time.LocalDateTime start, java.time.LocalDateTime end) {
        return springRepo.findCompletedByUserIdBetween(userId, SessionStatus.COMPLETED, start, end);
    }

    @Override
    public List<PomodoroSession> findCompletedByUserId(Long userId) {
        return springRepo.findCompletedByUserId(userId, SessionStatus.COMPLETED);
    }

    @Override
    public List<PomodoroSession> findRecentCompletedByUserId(Long userId, int limit) {
        if (limit <= 0) {
            throw new IllegalArgumentException("Limit must be positive");
        }
        return springRepo.findRecentCompletedByUserId(userId, SessionStatus.COMPLETED, PageRequest.of(0, limit));
    }

    @Override
    public List<String> findRecentNotesByActivityId(Long activityId, int limit) {
        return springRepo.findRecentNotesByActivityId(activityId, org.springframework.data.domain.PageRequest.of(0, limit));
    }

    @Override
    public List<PomodoroSession> findSessionsNeedingNotification(java.time.LocalDateTime now) {
        return springRepo.findSessionsNeedingNotification(now);
    }
}
