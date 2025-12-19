package com.pomodify.backend.application.service;

import com.pomodify.backend.domain.model.User;
import com.pomodify.backend.domain.repository.UserRepository;
import com.pomodify.backend.domain.valueobject.Email;
import com.pomodify.backend.infrastructure.security.CustomOAuth2User; // Import from your config package
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        // 1. Load user info from Google/Provider
        OAuth2User oAuth2User = super.loadUser(userRequest);

        // 2. Extract Details
        String emailStr = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");
        String firstName = oAuth2User.getAttribute("given_name");
        String lastName = oAuth2User.getAttribute("family_name");

        // Fallback logic for names
        String finalFirstName = firstName != null ? firstName : (name != null ? name.split(" ")[0] : "Unknown");
        String finalLastName = lastName != null ? lastName : (name != null && name.contains(" ") ? name.substring(name.indexOf(" ") + 1) : "User");

        log.info("OAuth2 login request for email: {}", emailStr);

        if (emailStr == null) {
            throw new OAuth2AuthenticationException("Email not found from OAuth2 provider");
        }

        // 3. Find or Create User (and capture the result!)
        User user = userRepository.findByEmail(new Email(emailStr))
                .orElseGet(() -> {
                    log.info("User {} not found, registering new user.", emailStr);
                    User newUser = User.builder()
                            .email(new Email(emailStr))
                            .firstName(finalFirstName)
                            .lastName(finalLastName)
                            .passwordHash(UUID.randomUUID().toString()) // Dummy password
                            .isEmailVerified(true) // Verified by Google
                            .isActive(true)
                            .build();
                    return userRepository.save(newUser);
                });

        log.info("User successfully loaded/saved: {}", user.getId());

        // 4. Return the Custom Wrapper containing BOTH the OAuth data and your Backend User
        return new CustomOAuth2User(oAuth2User, user);
    }
}