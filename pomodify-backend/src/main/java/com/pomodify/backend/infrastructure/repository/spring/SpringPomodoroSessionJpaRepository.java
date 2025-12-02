package com.pomodify.backend.infrastructure.repository.spring;

import com.pomodify.backend.domain.model.PomodoroSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    @Query("select case when count(s)>0 then true else false end from PomodoroSession s where s.id=:id and s.activity.user.id=:userId")
    boolean existsByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);
}
