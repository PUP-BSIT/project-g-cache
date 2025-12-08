package com.pomodify.backend.domain.repository;

import com.pomodify.backend.domain.model.UserBadge;
import java.util.List;
import java.util.Optional;

public interface UserBadgeRepository {
    Optional<UserBadge> findByUserIdAndMilestoneDays(Long userId, int milestoneDays);
    List<UserBadge> findByUserId(Long userId);
    UserBadge save(UserBadge badge);
}
