package com.pomodify.backend.infrastructure.repository.spring;

import com.pomodify.backend.domain.model.PomodoroSession;
import com.pomodify.backend.domain.enums.SessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

public interface SpringPomodoroSessionJpaRepository extends JpaRepository<PomodoroSession, Long> {

    @Query("select s from PomodoroSession s where s.id=:id and s.activity.user.id=:userId")
    Optional<PomodoroSession> findByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);

    @Query("select s from PomodoroSession s where s.activity.user.id=:userId")
    List<PomodoroSession> findByUserId(@Param("userId") Long userId);

    @Query("select s from PomodoroSession s where s.activity.user.id=:userId and s.isDeleted=false")
    List<PomodoroSession> findActiveByUserId(@Param("userId") Long userId);

    @Query("select s from PomodoroSession s where s.activity.id=:activityId")
    List<PomodoroSession> findByActivityId(@Param("activityId") Long activityId);

    @Query("select s from PomodoroSession s where s.activity.id=:activityId and s.activity.user.id=:userId")
    List<PomodoroSession> findByActivityIdAndUserId(@Param("activityId") Long activityId, @Param("userId") Long userId);

    @Query("select case when count(s)>0 then true else false end from PomodoroSession s where s.id=:id and s.activity.user.id=:userId")
    boolean existsByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);

    @Query("select s from PomodoroSession s JOIN FETCH s.activity where s.activity.user.id=:userId and s.status = :status and s.completedAt between :start and :end")
    List<PomodoroSession> findCompletedByUserIdBetween(@Param("userId") Long userId, @Param("status") SessionStatus status, @Param("start") java.time.LocalDateTime start, @Param("end") java.time.LocalDateTime end);

    @Query("select s from PomodoroSession s JOIN FETCH s.activity where s.activity.user.id=:userId and s.status = :status")
    List<PomodoroSession> findCompletedByUserId(@Param("userId") Long userId, @Param("status") SessionStatus status);

    @Query("select s from PomodoroSession s JOIN FETCH s.activity where s.activity.user.id=:userId and s.status = :status order by s.completedAt desc")
    List<PomodoroSession> findRecentCompletedByUserId(@Param("userId") Long userId, @Param("status") SessionStatus status, Pageable pageable);

    @Query("SELECT n.content FROM PomodoroSession s JOIN s.note n WHERE s.activity.id = :activityId AND n.content IS NOT NULL ORDER BY s.completedAt DESC")
    List<String> findRecentNotesByActivityId(@Param("activityId") Long activityId, Pageable pageable);
}
