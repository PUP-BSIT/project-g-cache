package com.pomodify.backend.factory;

import com.pomodify.backend.domain.dto.RegisterRequest;
import com.pomodify.backend.domain.model.User;
import com.pomodify.backend.domain.valueobject.Email

public class UserFactory {
    public User create(String username, String email, String passwordHash) {
        Email email = new Email(email);
        return User.builder()
                .username(username)
                .email(email)
                .passwordHash(hashedPassword)
                .build();
    }
}
