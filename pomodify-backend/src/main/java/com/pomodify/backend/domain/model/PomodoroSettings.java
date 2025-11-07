package com.pomodify.backend.domain.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "pomodoro_settings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PomodoroSettings {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

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

    public static PomodoroSettings createDefault(User user) {
        return PomodoroSettings.builder()
                .user(user)
                .workDurationMinutes(25)
                .shortBreakMinutes(5)
                .longBreakMinutes(15)
                .sessionsUntilLongBreak(4)
                .autoStartBreaks(false)
                .autoStartSessions(false)
                .build();
    }
}