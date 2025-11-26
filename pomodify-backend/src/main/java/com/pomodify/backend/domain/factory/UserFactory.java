package com.pomodify.backend.domain.factory;

import com.pomodify.backend.domain.model.User;
import com.pomodify.backend.domain.valueobject.Email;

public interface UserFactory {

    User createUser(String firstName,
                    String lastName,
                    Email email,
                    String passwordHash);
}
