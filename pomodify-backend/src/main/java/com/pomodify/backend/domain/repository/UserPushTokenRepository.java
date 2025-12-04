package com.pomodify.backend.domain.repository;

import com.pomodify.backend.domain.model.UserPushToken;

import java.util.Optional;

public interface UserPushTokenRepository {
    Optional<UserPushToken> findByUserId(Long userId);
    UserPushToken save(UserPushToken token);
    void deleteByUserId(Long userId);
}
