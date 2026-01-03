package com.pomodify.backend.infrastructure.repository.impl;

import com.pomodify.backend.domain.model.User;
import com.pomodify.backend.domain.repository.UserRepository;
import com.pomodify.backend.domain.valueobject.Email;
import com.pomodify.backend.infrastructure.repository.spring.SpringUserJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

/**
 * JPA adapter implementation of the domain UserRepository interface.
 * Delegates to the Spring Data JPA repository while conforming
 * to the domain's repository contract.
 */
@Component
@RequiredArgsConstructor
public class UserRepositoryJpaAdapter extends BaseRepositoryImpl implements UserRepository {

    private final SpringUserJpaRepository springUserJpaRepository;

    @Override
    public User save(User user) {
        return springUserJpaRepository.save(checkNotNull(user, "User"));
    }

    @Override
    public Optional<User> findUser(Long id) {
        return springUserJpaRepository.findById(checkNotNull(id, "User ID"));
    }

    @Override
    public Optional<User> findByEmail(Email email) {
        return springUserJpaRepository.findByEmail(checkNotNull(email, "Email"));
    }

    @Override
    public boolean existsByEmail(Email email) {
        return springUserJpaRepository.existsByEmail(checkNotNull(email, "Email"));
    }

    @Override
    public void delete(User user) {
        checkNotNull(user, "User");
        user.deactivate(); // soft delete
        springUserJpaRepository.save(user);
    }

    @Override
    public List<User> findAllActive() {
        return springUserJpaRepository.findAllActive();
    }

    @Override
    public Optional<User> findByBackupEmail(String backupEmail) {
        return springUserJpaRepository.findByBackupEmail(checkNotNull(backupEmail, "Backup Email"));
    }
}
