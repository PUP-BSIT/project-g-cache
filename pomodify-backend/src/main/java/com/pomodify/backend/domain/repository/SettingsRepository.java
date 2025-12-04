package com.pomodify.backend.domain.repository;

import com.pomodify.backend.domain.model.settings.UserSettings;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SettingsRepository extends JpaRepository<UserSettings, Long> {
}
