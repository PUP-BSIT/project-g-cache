package com.pomodify.backend.infrastructure.repository.spring;

import com.pomodify.backend.domain.model.Activity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface SpringActivityJpaRepository extends JpaRepository<Activity, Long> {
    List<Activity> findByUserIdAndIsDeletedFalse(Long userId);
    
    List<Activity> findByCategoryIdAndUserIdAndIsDeletedFalse(Long categoryId, Long userId);
    
    @Query("SELECT a FROM Activity a WHERE a.user.id = :userId AND a.scheduledAt >= :date AND a.scheduledAt < :nextDate AND a.isDeleted = false")
    List<Activity> findScheduledForDate(@Param("userId") Long userId, @Param("date") LocalDate date);
    
    @Query("SELECT a FROM Activity a WHERE a.user.id = :userId AND EXISTS (SELECT s FROM PomodoroSession s WHERE s.activity = a AND s.isCompleted = false) AND a.isDeleted = false")
    List<Activity> findInProgressByUserId(@Param("userId") Long userId);
    
    @Query("SELECT DISTINCT a FROM Activity a JOIN a.sessions s WHERE a.user.id = :userId AND a.isDeleted = false AND s.startTime >= :startDate AND s.startTime < :endDate AND s.isCompleted = true")
    List<Activity> findCompletedByUserIdAndDateRange(@Param("userId") Long userId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
}