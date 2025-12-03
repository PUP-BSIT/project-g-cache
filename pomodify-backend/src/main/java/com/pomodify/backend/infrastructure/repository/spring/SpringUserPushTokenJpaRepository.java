package com.pomodify.backend.infrastructure.repository.spring;

import com.pomodify.backend.domain.model.UserPushToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SpringUserPushTokenJpaRepository extends JpaRepository<UserPushToken, Long> {
    Optional<UserPushToken> findByUserId(Long userId);
    void deleteByUserId(Long userId);
}
