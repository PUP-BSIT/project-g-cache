package com.pomodify.backend.application.event;

import org.springframework.context.ApplicationEvent;

public class UserSettingsChangedEvent extends ApplicationEvent {
    private final Long userId;
    private final boolean notificationsEnabled;

    public UserSettingsChangedEvent(Object source, Long userId, boolean notificationsEnabled) {
        super(source);
        this.userId = userId;
        this.notificationsEnabled = notificationsEnabled;
    }

    public Long getUserId() {
        return userId;
    }

    public boolean isNotificationsEnabled() {
        return notificationsEnabled;
    }
}
