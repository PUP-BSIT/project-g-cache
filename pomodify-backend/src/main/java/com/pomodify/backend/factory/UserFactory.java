package com.pomodify.backend.factory;

import com.pomodify.backend.domain.dto.RegisterRequest;
import com.pomodify.backend.domain.model.User;
import com.pomodify.backend.domain.valueobject.Email;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class UserFactory {

    private final PasswordEncoder passwordEncoder;

    public UserFactory(PasswordEncoder passwordEncoder) {
        this.passwordEncoder = passwordEncoder;
    }

    public User createUser(RegisterRequest request) {
        Email emailObj = new Email(request.email());
        String hashedPassword = passwordEncoder.encode(request.password());

        return User.builder()
                .username(request.username())
                .email(emailObj)
                .passwordHash(hashedPassword)
                .build();
    }
}
