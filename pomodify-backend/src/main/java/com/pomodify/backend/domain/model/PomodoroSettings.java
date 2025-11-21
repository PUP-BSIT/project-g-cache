package com.pomodify.backend.domain.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "pomodoro_settings")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder(access = AccessLevel.PRIVATE)
public class PomodoroSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ──────────────── Association ────────────────
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    // ──────────────── Settings ────────────────
    @Column(name = "work_duration_minutes", nullable = false)
    private Integer workDurationMinutes;

    @Column(name = "short_break_minutes", nullable = false)
    private Integer shortBreakMinutes;

    @Column(name = "long_break_minutes", nullable = false)
    private Integer longBreakMinutes;

    @Column(name = "sessions_until_long_break", nullable = false)
    private Integer sessionsUntilLongBreak;

    @Column(name = "auto_start_breaks", nullable = false)
    private boolean autoStartBreaks;

    @Column(name = "auto_start_sessions", nullable = false)
    private boolean autoStartSessions;

    // ──────────────── Factory ────────────────
    public static PomodoroSettings createDefault(User user) {
        if (user == null) throw new IllegalArgumentException("User cannot be null");
        return new PomodoroSettings(
                null,
                user,
                25,
                5,
                15,
                4,
                false,
                false
        );
    }

    public static PomodoroSettings createCustom(User user,
                                                Integer workMinutes,
                                                Integer shortBreak,
                                                Integer longBreak,
                                                Integer sessionsUntilLong,
                                                boolean autoStartBreaks,
                                                boolean autoStartSessions) {
        validateDurations(workMinutes, shortBreak, longBreak, sessionsUntilLong);
        return new PomodoroSettings(
                null,
                user,
                workMinutes,
                shortBreak,
                longBreak,
                sessionsUntilLong,
                autoStartBreaks,
                autoStartSessions
        );
    }

    // ──────────────── Behavior ────────────────
    public void updateSettings(Integer workMinutes,
                               Integer shortBreak,
                               Integer longBreak,
                               Integer sessionsUntilLong,
                               boolean autoStartBreaks,
                               boolean autoStartSessions) {
        validateDurations(workMinutes, shortBreak, longBreak, sessionsUntilLong);
        this.workDurationMinutes = workMinutes;
        this.shortBreakMinutes = shortBreak;
        this.longBreakMinutes = longBreak;
        this.sessionsUntilLongBreak = sessionsUntilLong;
        this.autoStartBreaks = autoStartBreaks;
        this.autoStartSessions = autoStartSessions;
    }

    public void resetToDefault() {
        this.workDurationMinutes = 25;
        this.shortBreakMinutes = 5;
        this.longBreakMinutes = 15;
        this.sessionsUntilLongBreak = 4;
        this.autoStartBreaks = false;
        this.autoStartSessions = false;
    }

    // ──────────────── Validation ────────────────
    private static void validateDurations(Integer work, Integer shortBreak, Integer longBreak, Integer sessions) {
        if (work == null || work <= 0)
            throw new IllegalArgumentException("Work duration must be positive");
        if (shortBreak == null || shortBreak <= 0)
            throw new IllegalArgumentException("Short break must be positive");
        if (longBreak == null || longBreak <= 0)
            throw new IllegalArgumentException("Long break must be positive");
        if (sessions == null || sessions <= 0)
            throw new IllegalArgumentException("Sessions until long break must be positive");
    }

    // ──────────────── Domain Convenience ────────────────
    public boolean isAutoModeEnabled() {
        return autoStartBreaks && autoStartSessions;
    }

    public int getTotalCycleDuration() {
        return workDurationMinutes + shortBreakMinutes;
    }
}
