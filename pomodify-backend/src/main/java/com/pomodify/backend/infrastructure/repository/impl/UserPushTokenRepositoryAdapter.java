package com.pomodify.backend.infrastructure.repository.impl;

import com.pomodify.backend.domain.model.UserPushToken;
import com.pomodify.backend.domain.repository.UserPushTokenRepository;
import com.pomodify.backend.infrastructure.repository.spring.SpringUserPushTokenJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class UserPushTokenRepositoryAdapter implements UserPushTokenRepository {

    private final SpringUserPushTokenJpaRepository springRepo;

    @Override
    public Optional<UserPushToken> findByUserId(Long userId) {
        return springRepo.findByUserId(userId);
    }

    @Override
    public UserPushToken save(UserPushToken token) {
        return springRepo.save(token);
    }

    @Override
    public void deleteByUserId(Long userId) {
        springRepo.deleteByUserId(userId);
    }
}
