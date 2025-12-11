package com.pomodify.backend.presentation.controller;

import com.pomodify.backend.application.service.SettingsService;
import com.pomodify.backend.presentation.dto.settings.UpdateSettingsRequest;
import com.pomodify.backend.presentation.dto.settings.UserSettingsResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v2/settings")
@Tag(name = "Settings", description = "User settings for the application")
@RequiredArgsConstructor
public class SettingsController {

    private final SettingsService settingsService;

    @GetMapping
    @Operation(summary = "Get current user settings")
    public ResponseEntity<UserSettingsResponse> getSettings(@AuthenticationPrincipal Jwt jwt) {
        Jwt resolvedJwt = jwt;
        if (resolvedJwt == null) {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth instanceof JwtAuthenticationToken jwtAuth) {
                Object principal = jwtAuth.getToken();
                if (principal instanceof Jwt j) resolvedJwt = j;
            } else if (auth != null && auth.getPrincipal() instanceof Jwt p) {
                resolvedJwt = (Jwt) auth.getPrincipal();
            }
        }
        if (resolvedJwt == null) {
            throw new org.springframework.security.authentication.AuthenticationCredentialsNotFoundException("Missing authentication token");
        }

        Long userId = null;
        try {
            Object claim = resolvedJwt.getClaims().get("user");
            if (claim instanceof Number n) userId = n.longValue();
            else if (claim instanceof String s) userId = Long.parseLong(s);
        } catch (Exception ignored) {
        }
        if (userId == null) throw new org.springframework.security.access.AccessDeniedException("Unauthorized: invalid user claim");
        return ResponseEntity.ok(settingsService.getSettings(userId));
    }

    @PatchMapping
    @Operation(summary = "Update current user settings")
    public ResponseEntity<UserSettingsResponse> updateSettings(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody UpdateSettingsRequest request) {
        Jwt resolvedJwt = jwt;
        if (resolvedJwt == null) {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth instanceof JwtAuthenticationToken jwtAuth) {
                Object principal = jwtAuth.getToken();
                if (principal instanceof Jwt j) resolvedJwt = j;
            } else if (auth != null && auth.getPrincipal() instanceof Jwt p) {
                resolvedJwt = (Jwt) auth.getPrincipal();
            }
        }
        if (resolvedJwt == null) {
            throw new org.springframework.security.authentication.AuthenticationCredentialsNotFoundException("Missing authentication token");
        }
        Long userId = null;
        try {
            Object claim = resolvedJwt.getClaims().get("user");
            if (claim instanceof Number n) userId = n.longValue();
            else if (claim instanceof String s) userId = Long.parseLong(s);
        } catch (Exception ignored) {
        }
        if (userId == null) throw new org.springframework.security.access.AccessDeniedException("Unauthorized: invalid user claim");
        return ResponseEntity.ok(settingsService.updateSettings(userId, request));
    }
}
