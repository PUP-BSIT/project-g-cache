package com.pomodify.backend.infrastructure.security;

import com.pomodify.backend.application.port.OAuth2UserPort;
import com.pomodify.backend.domain.model.User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Component;

/**
 * Infrastructure adapter implementing OAuth2UserPort.
 * Creates CustomOAuth2User instances.
 */
@Component
public class OAuth2UserAdapter implements OAuth2UserPort {
    
    @Override
    public OAuth2User createOAuth2User(OAuth2User delegate, User backendUser) {
        return new CustomOAuth2User(delegate, backendUser);
    }
}
