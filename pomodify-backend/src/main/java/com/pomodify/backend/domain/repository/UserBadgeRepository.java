package com.pomodify.backend.domain.repository;

import com.pomodify.backend.domain.model.UserBadge;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserBadgeRepository extends JpaRepository<UserBadge, Long> {
    Optional<UserBadge> findByUserIdAndMilestoneDays(Long userId, int milestoneDays);
    List<UserBadge> findByUserId(Long userId);
}
