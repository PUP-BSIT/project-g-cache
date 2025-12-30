package com.pomodify.backend.presentation.controller;

import com.pomodify.backend.application.command.dashboard.DashboardCommand;
import com.pomodify.backend.application.result.DashboardResult;
import com.pomodify.backend.application.service.DashboardService;
import com.pomodify.backend.application.helper.UserHelper;
import com.pomodify.backend.presentation.dto.item.RecentSessionItem;
import com.pomodify.backend.presentation.dto.response.DashboardResponse;
import com.pomodify.backend.presentation.mapper.DashboardMapper;
import com.pomodify.backend.infrastructure.config.CustomJwtDecoder;
import com.pomodify.backend.infrastructure.security.JwtAuthenticationEntryPoint;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = DashboardController.class)
@AutoConfigureMockMvc(addFilters = false)
class DashboardControllerWebMvcTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DashboardService dashboardService;

    @MockBean
    private DashboardMapper dashboardMapper;

    @MockBean
    private UserHelper userHelper;

    // Mock beans to satisfy potential security wiring if loaded
    @MockBean
    private CustomJwtDecoder customJwtDecoder;

    @MockBean
    private JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;

    @MockBean
    private com.pomodify.backend.application.service.CustomOAuth2UserService customOAuth2UserService;

    @MockBean
    private com.pomodify.backend.infrastructure.security.OAuth2AuthenticationSuccessHandler oAuth2AuthenticationSuccessHandler;

    @Test
    void getDashboard_returnsMappedResponse() throws Exception {
        // Arrange
        DashboardResult result = DashboardResult.builder()
                .currentStreak(2)
                .bestStreak(5)
                .totalActivities(3)
                .totalSessions(7)
                .focusSecondsToday(5400) // 1.5h -> 1.5 rounded to 1.5 (one decimal 1.5)
                .focusSecondsThisWeek(10800) // 3h -> 3.0
                .focusSecondsAllTime(36000) // 10h -> 10.0
                .recentSessions(List.of(
                        DashboardResult.RecentSession.builder()
                                .id(101L)
                                .activityId(11L)
                                .activityName("Study")
                                .completedAt(LocalDateTime.now().minusHours(1))
                                .cyclesCompleted(3)
                                .focusSeconds(4500)
                                .build()
                ))
                .build();

        DashboardResponse response = DashboardResponse.builder()
                .currentStreak(2)
                .bestStreak(5)
                .totalActivities(3)
                .totalSessions(7)
                .focusHoursToday(1.5)
                .focusHoursThisWeek(3.0)
                .focusHoursAllTime(10.0)
                .recentSessions(List.of(
                        RecentSessionItem.builder()
                                .id(101L)
                                .activityId(11L)
                                .activityName("Study")
                                .completedAt(result.getRecentSessions().getFirst().getCompletedAt())
                                .cyclesCompleted(3)
                                .focusHours(1.3)
                                .build()
                ))
                .build();

        when(dashboardService.getDashboard(any(DashboardCommand.class))).thenReturn(result);
        when(dashboardMapper.toResponse(eq(result), anyString())).thenReturn(response);
        when(userHelper.extractUserId(any(Jwt.class))).thenReturn(42L);

        Jwt jwtToken = Jwt.withTokenValue("test-token")
                .header("alg", "none")
                .claim("user", 42)
                .build();
        JwtAuthenticationToken authentication = new JwtAuthenticationToken(jwtToken);
        SecurityContextHolder.getContext().setAuthentication(authentication);

        // Act + Assert
        mockMvc.perform(get("/dashboard")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.currentStreak", is(2)))
                .andExpect(jsonPath("$.bestStreak", is(5)))
                .andExpect(jsonPath("$.totalActivities", is(3)))
                .andExpect(jsonPath("$.totalSessions", is(7)))
                .andExpect(jsonPath("$.focusHoursToday", is(1.5)))
                .andExpect(jsonPath("$.focusHoursThisWeek", is(3.0)))
                .andExpect(jsonPath("$.focusHoursAllTime", is(10.0)))
                .andExpect(jsonPath("$.recentSessions", hasSize(1)))
                .andExpect(jsonPath("$.recentSessions[0].activityName", is("Study")))
                .andExpect(jsonPath("$.recentSessions[0].cyclesCompleted", is(3)));
    }
}
