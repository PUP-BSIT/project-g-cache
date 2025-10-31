package com.pomodify.backend.application.services;

import com.pomodify.backend.application.dto.request.ProfileRequest;
import com.pomodify.backend.application.dto.response.ProfileResponse;
import com.pomodify.backend.domain.model.User;
import com.pomodify.backend.domain.repository.UserRepository;
import com.pomodify.backend.domain.valueobject.Email;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class ProfileService {
    @Autowired
    private UserRepository userRepository;

    @Transactional
    public ProfileResponse deleteProfile(ProfileRequest profileRequest) {
        // Here you would add logic to delete the user's profile from the database.
        // For this example, we'll just return a ProfileResponse with the username.

        log.info("Attempting to delete user: {}", profileRequest.usernameOrEmail());

        User user = userRepository.findByUsername(profileRequest.usernameOrEmail())
                .orElseGet(() -> userRepository.findByEmail(new Email(profileRequest.usernameOrEmail()))
                        .orElseThrow(() -> new IllegalArgumentException("User not found")));

        user.delete();
        userRepository.save(user);
        return new ProfileResponse(profileRequest.usernameOrEmail());
    }
}
