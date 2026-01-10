package com.pomodify.backend.application.port;

import com.pomodify.backend.domain.model.User;
import org.springframework.security.oauth2.core.user.OAuth2User;

/**
 * Port (interface) for creating OAuth2 user objects.
 * This allows the application layer to create OAuth2 users without depending on infrastructure.
 */
public interface OAuth2UserPort {
    
    /**
     * Creates an OAuth2User object that includes our backend User entity.
     * 
     * @param delegate The original OAuth2User from the provider
     * @param backendUser Our domain User entity
     * @return An OAuth2User implementation that wraps both
     */
    OAuth2User createOAuth2User(OAuth2User delegate, User backendUser);
}
