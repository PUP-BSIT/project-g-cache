package com.pomodify.backend.infrastructure.factory;

import com.pomodify.backend.domain.factory.UserFactory;
import com.pomodify.backend.domain.model.User;
import com.pomodify.backend.domain.valueobject.Email;
import org.springframework.stereotype.Component;

@Component
public class UserFactoryImpl implements UserFactory {

    @Override
    public User createUser(String firstName,
                           String lastName,
                           Email email,
                           String passwordHash) {

        if (firstName == null || firstName.isBlank()) {
            throw new IllegalArgumentException("First name cannot be null or blank");
        }
        if (lastName == null || lastName.isBlank()) {
            throw new IllegalArgumentException("Last name cannot be null or blank");
        }
        if (email == null) {
            throw new IllegalArgumentException("Email cannot be null");
        }
        if (passwordHash == null || passwordHash.isBlank()) {
            throw new IllegalArgumentException("Password hash cannot be null or blank");
        }

        return User.builder()
                .firstName(firstName.trim())
                .lastName(lastName.trim())
                .email(email)
                .passwordHash(passwordHash)
                .isEmailVerified(false)
                .isActive(true)
                .authProvider(com.pomodify.backend.domain.enums.AuthProvider.LOCAL)
                .build();
    }
}
