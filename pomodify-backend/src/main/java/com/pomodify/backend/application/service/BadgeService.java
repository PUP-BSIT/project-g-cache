package com.pomodify.backend.application.service;

import com.pomodify.backend.domain.model.UserBadge;
import com.pomodify.backend.domain.repository.UserBadgeRepository;
import com.pomodify.backend.domain.repository.PomodoroSessionRepository;
import com.pomodify.backend.domain.model.User;
import com.pomodify.backend.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BadgeService {

    private final UserBadgeRepository userBadgeRepository;
    private final PomodoroSessionRepository sessionRepository;
    private final UserRepository userRepository;

    private static final List<Integer> MILESTONES = Arrays.asList(3, 7, 14, 30, 100, 365);
    private static final List<String> BADGE_NAMES = Arrays.asList(
            "The Bookmark", "Deep Work", "The Protégé", "The Curator", "The Scholar", "The Alchemist"
    );

    public List<UserBadge> getBadgesForUser(Long userId) {
        return userBadgeRepository.findByUserId(userId);
    }

    public UserBadge awardBadgesIfEligible(Long userId) {
        // Compute current streak for the user using sessions
        User user = userRepository.findUser(userId).orElse(null);
        if (user == null) return null;
        // get distinct days the user had completed sessions
        java.util.Set<java.time.LocalDate> focusDays = sessionRepository.findCompletedByUserId(userId).stream()
                .filter(ss -> ss.getCompletedAt() != null)
                .map(ss -> ss.getCompletedAt().toLocalDate())
                .collect(Collectors.toSet());
        int currentStreak = user.getCurrentStreak(focusDays, java.time.LocalDate.now());
        // Award any milestones not yet awarded; return the last awarded badge if any
        Set<Integer> existing = userBadgeRepository.findByUserId(userId).stream().map(UserBadge::getMilestoneDays).collect(Collectors.toSet());
        UserBadge lastAwarded = null;
        for (int i = 0; i < MILESTONES.size(); i++) {
            int m = MILESTONES.get(i);
            if (currentStreak >= m && !existing.contains(m)) {
                UserBadge badge = UserBadge.builder()
                        .userId(userId)
                        .milestoneDays(m)
                        .name(BADGE_NAMES.get(i))
                        .dateAwarded(LocalDate.now())
                        .build();
                lastAwarded = userBadgeRepository.save(badge);
            }
        }
        return lastAwarded;
    }
}
