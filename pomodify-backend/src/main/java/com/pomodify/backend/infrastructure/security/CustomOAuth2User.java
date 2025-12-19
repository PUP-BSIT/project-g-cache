package com.pomodify.backend.infrastructure.security;

import com.pomodify.backend.domain.model.User;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.user.OAuth2User;

import java.util.Collection;
import java.util.Map;

@Getter
public class CustomOAuth2User implements OAuth2User {

    private final OAuth2User delegate;
    private final User backendUser;

    public CustomOAuth2User(OAuth2User delegate, User backendUser) {
        this.delegate = delegate;
        this.backendUser = backendUser;
    }

    @Override
    public Map<String, Object> getAttributes() {
        return delegate.getAttributes();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return delegate.getAuthorities();
    }

    @Override
    public String getName() {
        return delegate.getName();
    }
    
    // Helper to get email easily if needed
    public String getEmail() {
        return backendUser.getEmail().getValue(); 
    }
}