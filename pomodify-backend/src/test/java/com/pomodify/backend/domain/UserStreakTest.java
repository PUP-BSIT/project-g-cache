package com.pomodify.backend.domain;

import com.pomodify.backend.domain.model.User;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

public class UserStreakTest {

    @Test
    void currentStreak_counts_consecutive_days_until_today() {
        User user = User.builder().firstName("A").lastName("B").passwordHash("x").email(new com.pomodify.backend.domain.valueobject.Email("a@b.com")).authProvider(com.pomodify.backend.domain.enums.AuthProvider.LOCAL).build();
        Set<LocalDate> days = new HashSet<>();
        LocalDate today = LocalDate.now();
        days.add(today.minusDays(2));
        days.add(today.minusDays(1));
        days.add(today);
        int streak = user.getCurrentStreak(days, today);
        assertEquals(3, streak);
    }

    @Test
    void currentStreak_stops_on_gap() {
        User user = User.builder().firstName("A").lastName("B").passwordHash("x").email(new com.pomodify.backend.domain.valueobject.Email("a@b.com")).authProvider(com.pomodify.backend.domain.enums.AuthProvider.LOCAL).build();
        Set<LocalDate> days = new HashSet<>();
        LocalDate today = LocalDate.now();
        days.add(today.minusDays(3));
        days.add(today.minusDays(1));
        days.add(today);
        int streak = user.getCurrentStreak(days, today);
        assertEquals(2, streak); // today and yesterday only
    }

    @Test
    void bestStreak_finds_longest_run() {
        User user = User.builder().firstName("A").lastName("B").passwordHash("x").email(new com.pomodify.backend.domain.valueobject.Email("a@b.com")).authProvider(com.pomodify.backend.domain.enums.AuthProvider.LOCAL).build();
        Set<LocalDate> days = new HashSet<>();
        LocalDate base = LocalDate.of(2025, 1, 1);
        // streak1: 2 days
        days.add(base);
        days.add(base.plusDays(1));
        // gap
        days.add(base.plusDays(3));
        // streak2: 3 days
        days.add(base.plusDays(10));
        days.add(base.plusDays(11));
        days.add(base.plusDays(12));
        int best = user.getBestStreak(days);
        assertEquals(3, best);
    }
}
