package com.pomodify.backend.presentation.controller;

import com.pomodify.backend.application.command.dashboard.DashboardCommand;
import com.pomodify.backend.application.service.DashboardService;
import com.pomodify.backend.application.helper.UserHelper;
import com.pomodify.backend.presentation.dto.response.DashboardResponse;
import com.pomodify.backend.presentation.mapper.DashboardMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.ZoneId;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.oauth2.jwt.Jwt;

@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "Motivation-focused dashboard metrics and streak badges")
public class DashboardController {

    private final DashboardService dashboardService;
    private final DashboardMapper dashboardMapper;
    private final UserHelper userHelper;

        @GetMapping
        @Operation(
            summary = "Get focus dashboard",
            description = "Returns a compact, positive-only dashboard with streaks, focus hours, badges, and recent sessions."
        )
        public DashboardResponse getDashboard(
            @AuthenticationPrincipal org.springframework.security.oauth2.jwt.Jwt jwt,
            @Parameter(
                name = "X-Timezone",
                description = "IANA timezone ID used for date-based calculations (e.g. Asia/Manila)",
                in = ParameterIn.HEADER
            )
            @org.springframework.web.bind.annotation.RequestHeader(value = "X-Timezone", defaultValue = "Asia/Manila") String timezone,
            @Parameter(
                name = "layout",
                description = "Dashboard layout: 'compact' (default) or 'detailed'",
                in = ParameterIn.QUERY
            )
            @org.springframework.web.bind.annotation.RequestParam(name = "layout", defaultValue = "compact") String layout
    ) {
        // Resolve Jwt from parameter or SecurityContext (tests may set principal directly)
        Jwt resolvedJwt = jwt;
        if (resolvedJwt == null) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth instanceof JwtAuthenticationToken jwtAuth) {
                Object principal = jwtAuth.getToken();
                if (principal instanceof Jwt j) resolvedJwt = j;
            } else if (auth != null && auth.getPrincipal() instanceof Jwt) {
                resolvedJwt = (Jwt) auth.getPrincipal();
            }
        }

        if (resolvedJwt == null) {
            throw new org.springframework.security.authentication.AuthenticationCredentialsNotFoundException("Missing authentication token");
        }
        Long userId = userHelper.extractUserId(resolvedJwt);
        if (userId == null) {
            // Treat missing/invalid JWT claim as unauthorized
            throw new org.springframework.security.access.AccessDeniedException("Unauthorized: invalid user claim");
        }
        DashboardCommand cmd = DashboardCommand.of(userId, ZoneId.of(timezone));
        return dashboardMapper.toResponse(dashboardService.getDashboard(cmd), layout);
    }
}
