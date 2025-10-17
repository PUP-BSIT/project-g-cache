package com.pomodify.backend.infrastructure.repository.impl;

import com.pomodify.backend.domain.model.User;
import com.pomodify.backend.domain.repository.UserRepository;
import com.pomodify.backend.domain.valueobject.Email;
import com.pomodify.backend.infrastructure.repository.spring.SpringUserJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * JPA adapter implementation of the domain UserRepository interface.
 * This adapter delegates to Spring Data JPA repository while implementing
 * the domain's repository contract.
 */
@Component
@RequiredArgsConstructor
public class UserRepositoryJpaAdapter implements UserRepository {
    
    private final SpringUserJpaRepository springUserJpaRepository;

    @Override
    public User save(User user) {
        return springUserJpaRepository.save(user);
    }

    @Override
    public Optional<User> findById(Long id) {
        return springUserJpaRepository.findById(id);
    }

    @Override
    public Optional<User> findByUsername(String username) {
        return springUserJpaRepository.findByUsername(username);
    }

    @Override
    public Optional<User> findByEmail(Email email) {
        return springUserJpaRepository.findByEmail(email);
    }

    @Override
    public boolean existsByUsername(String username) {
        return springUserJpaRepository.existsByUsername(username);
    }

    @Override
    public boolean existsByEmail(Email email) {
        return springUserJpaRepository.existsByEmail(email);
    }

    @Override
    public void delete(User user) {
        // Soft delete: mark as deleted and save
        user.delete();
        springUserJpaRepository.save(user);
    }

    @Override
    public Iterable<User> findAllActive() {
        return springUserJpaRepository.findAllActive();
    }
}

