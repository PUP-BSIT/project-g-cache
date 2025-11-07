package com.pomodify.backend.application.repository;

import com.pomodify.backend.application.dto.SessionDTO;
import java.time.LocalDate;
import java.util.List;

public interface SessionQueryRepository {
    List<SessionDTO> findByActivityId(Long activityId);
    List<SessionDTO> findCompletedByUserIdAndDate(Long userId, LocalDate date);
    List<SessionDTO> findInProgressByUserId(Long userId);
}