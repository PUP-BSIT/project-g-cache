package com.pomodify.backend.repository;

import com.pomodify.backend.domain.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import com.pomodify.backend.domain.valueobject.Email;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    boolean existsByUsername(String username);
    boolean existsByEmail(Email email);

    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(Email email);
}
