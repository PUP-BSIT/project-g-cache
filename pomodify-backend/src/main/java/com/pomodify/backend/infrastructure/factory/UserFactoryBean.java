package com.pomodify.backend.infrastructure.factory;

import com.pomodify.backend.domain.factory.UserFactory;
import com.pomodify.backend.domain.model.User;
import org.springframework.stereotype.Component;

/**
 * Spring-managed wrapper for UserFactory.
 * Allows dependency injection while keeping domain factory framework-agnostic.
 */
@Component
public class UserFactoryBean {

    private final UserFactory userFactory;

    public UserFactoryBean() {
        this.userFactory = new UserFactory();
    }

    /**
     * Create a new User with the given credentials.
     * Delegates to domain factory.
     */
    public User createUser(String username, String emailValue, String passwordHash) {
        return userFactory.createUser(username, emailValue, passwordHash);
    }
}

