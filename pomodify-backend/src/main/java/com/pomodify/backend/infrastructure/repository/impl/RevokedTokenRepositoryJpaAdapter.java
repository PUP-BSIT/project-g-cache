package com.pomodify.backend.infrastructure.repository.impl;

import com.pomodify.backend.domain.model.RevokedToken;
import com.pomodify.backend.domain.repository.RevokedTokenRepository;
import com.pomodify.backend.infrastructure.repository.spring.SpringRevokedTokenJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * JPA adapter implementation for RevokedTokenRepository.
 */
@Repository
@RequiredArgsConstructor
public class RevokedTokenRepositoryJpaAdapter implements RevokedTokenRepository {

    private final SpringRevokedTokenJpaRepository springRepository;

    @Override
    public boolean existsByToken(String token) {
        return springRepository.existsByToken(token);
    }

    @Override
    public Optional<RevokedToken> findByToken(String token) {
        return springRepository.findByToken(token);
    }

    @Override
    public RevokedToken save(RevokedToken revokedToken) {
        return springRepository.save(revokedToken);
    }
}
