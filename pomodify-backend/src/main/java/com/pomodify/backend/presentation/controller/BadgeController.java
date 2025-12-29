package com.pomodify.backend.presentation.controller;

import com.pomodify.backend.application.service.BadgeService;
import com.pomodify.backend.application.helper.UserHelper;
import com.pomodify.backend.domain.model.UserBadge;
import com.pomodify.backend.presentation.dto.response.BadgeResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/badges")
@RequiredArgsConstructor
@Tag(name = "Badges", description = "User achievement badges")
public class BadgeController {

    private final BadgeService badgeService;
    private final UserHelper userHelper;

    private static final Map<Integer, String> BADGE_IMAGES = Map.of(
            3, "assets/images/badges/the-bookmark.png",
            7, "assets/images/badges/deep-work.png",
            14, "assets/images/badges/the-protégé.png",
            30, "assets/images/badges/the-curator.png",
            100, "assets/images/badges/the-scholar.png",
            365, "assets/images/badges/the-alchemist.png"
    );

    @GetMapping
    @Operation(summary = "Get user badges", description = "Returns all badges earned by the authenticated user")
    public List<BadgeResponse> getUserBadges(@AuthenticationPrincipal Jwt jwt) {
        Long userId = userHelper.extractUserId(jwt);
        List<UserBadge> badges = badgeService.getBadgesForUser(userId);

        return badges.stream()
                .map(badge -> BadgeResponse.builder()
                        .id(badge.getId())
                        .name(badge.getName())
                        .milestoneDays(badge.getMilestoneDays())
                        .dateAwarded(badge.getDateAwarded())
                        .imageUrl(BADGE_IMAGES.getOrDefault(badge.getMilestoneDays(), ""))
                        .build())
                .toList();
    }
}
