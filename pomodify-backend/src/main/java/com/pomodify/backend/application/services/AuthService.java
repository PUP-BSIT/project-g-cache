package com.pomodify.backend.services;

import com.pomodify.backend.domain.factory.UserFactory;
import com.pomodify.backend.domain.model.User;
import com.pomodify.backend.domain.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Register a new user.
     * Application service handles password encoding (framework concern),
     * then delegates to domain factory for user creation (domain logic).
     */
    @Transactional
    public User registerUser(String username, String email, String rawPassword) {
        log.info("Registering new user: {}", username);

        // Application layer handles framework-specific password encoding
        String passwordHash = passwordEncoder.encode(rawPassword);

        // Domain factory handles domain logic and validation
        // Instantiate factory manually since it's a plain domain class (no @Component)
        UserFactory userFactory = new UserFactory();
        User user = userFactory.createUser(username, email, passwordHash);

        // Save through repository
        return userRepository.save(user);
    }

    /**
     * Authenticate user with username and password.
     */
    public User authenticate(String username, String rawPassword) {
        log.info("Authenticating user: {}", username);

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Invalid username or password"));

        if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid username or password");
        }

        if (user.isDeleted()) {
            throw new IllegalStateException("User account has been deleted");
        }

        return user;
    }
}