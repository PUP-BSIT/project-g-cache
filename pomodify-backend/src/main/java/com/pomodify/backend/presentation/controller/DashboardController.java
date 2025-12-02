package com.pomodify.backend.presentation.controller;

import com.pomodify.backend.application.command.dashboard.DashboardCommand;
import com.pomodify.backend.application.service.DashboardService;
import com.pomodify.backend.application.helper.UserHelper;
import com.pomodify.backend.presentation.dto.response.DashboardResponse;
import com.pomodify.backend.presentation.mapper.DashboardMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.ZoneId;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;
    private final DashboardMapper dashboardMapper;
    private final UserHelper userHelper;

    @GetMapping("/dashboard")
    public DashboardResponse getDashboard(
            @AuthenticationPrincipal org.springframework.security.oauth2.jwt.Jwt jwt,
            @org.springframework.web.bind.annotation.RequestHeader(value = "X-Timezone", defaultValue = "Asia/Manila") String timezone
    ) {
        Long userId = userHelper.extractUserId(jwt);
        if (userId == null) {
            // Treat missing/invalid JWT claim as unauthorized
            throw new org.springframework.security.access.AccessDeniedException("Unauthorized: invalid user claim");
        }
        DashboardCommand cmd = DashboardCommand.of(userId, ZoneId.of(timezone));
        return dashboardMapper.toResponse(dashboardService.getDashboard(cmd));
    }
}
