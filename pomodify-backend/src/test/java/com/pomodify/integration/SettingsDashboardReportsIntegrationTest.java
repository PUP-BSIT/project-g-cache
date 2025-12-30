package com.pomodify.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pomodify.backend.presentation.dto.request.auth.LoginRequest;
import com.pomodify.backend.presentation.dto.request.auth.RegisterRequest;
import com.pomodify.backend.presentation.dto.response.AuthResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.junit.jupiter.api.Disabled;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for SettingsController, DashboardController, and ReportsController.
 * Tests user settings, dashboard data, and reports endpoints.
 * DISABLED: Requires Docker Desktop to be running. Tests can be enabled once Docker is available.
 */
@SpringBootTest(classes = com.pomodify.backend.PomodifyApiApplication.class)
@AutoConfigureMockMvc
@Testcontainers
class SettingsDashboardReportsIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("pomodifydb_test")
            .withUsername("postgres")
            .withPassword("postgres");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
        registry.add("spring.flyway.enabled", () -> "false");
        registry.add("jwt.secret", () -> "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");
        registry.add("jwt.access-token-expiration", () -> "900000");
        registry.add("jwt.refresh-token-expiration", () -> "2592000000");
        registry.add("fcm.service-account", () -> "");
        registry.add("spring.mail.host", () -> "");
        registry.add("spring.mail.port", () -> "0");
        registry.add("spring.security.oauth2.client.registration.google.client-id", () -> "test-client-id");
        registry.add("spring.security.oauth2.client.registration.google.client-secret", () -> "test-client-secret");
        // Disable AI for tests (use NoOpAiAdapter)
        registry.add("ai.enabled", () -> "false");
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String testEmail;
    private String accessToken;

    @BeforeEach
    void setUp() throws Exception {
        // Generate unique email per test run
        testEmail = "john" + System.currentTimeMillis() + "@example.com";
        
        // Register user
        RegisterRequest registerRequest = new RegisterRequest("John", "Doe", testEmail, "Password123!");
        mockMvc.perform(post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated());

        // Login and extract token from cookie
        LoginRequest loginRequest = new LoginRequest(testEmail, "Password123!");
        MvcResult loginResult = mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andReturn();

        // Extract accessToken from cookies
        this.accessToken = loginResult.getResponse().getCookie("accessToken").getValue();
    }

    @Test
    void testGetSettings() throws Exception {
        mockMvc.perform(get("/settings")
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").isNotEmpty());
    }

    @Test
    void testUpdateSettings() throws Exception {
        String settingsRequest = """
                {
                    "pomodoroDuration": 30,
                    "shortBreakDuration": 5,
                    "longBreakDuration": 15,
                    "sessionsUntilLongBreak": 4,
                    "autoStartNextSession": true,
                    "soundEnabled": true
                }
                """;

        mockMvc.perform(patch("/settings")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(settingsRequest))
                .andExpect(status().isOk());
    }

    @Test
    void testGetDashboard() throws Exception {
        mockMvc.perform(get("/dashboard")
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalSessions").isNumber())
                .andExpect(jsonPath("$.focusHoursThisWeek").isNumber())
                .andExpect(jsonPath("$.currentStreak").isNumber());
    }

    @Test
    void testGetReportsSummary() throws Exception {
        mockMvc.perform(get("/reports/summary")
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.report.overview.sessionsCount").isNumber())
                .andExpect(jsonPath("$.report.overview.totalFocusHours").isNumber());
    }

    @Test
    void testGetSettings_Unauthenticated() throws Exception {
        mockMvc.perform(get("/settings")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testGetDashboard_Unauthenticated() throws Exception {
        mockMvc.perform(get("/dashboard")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testGetReportsSummary_Unauthenticated() throws Exception {
        mockMvc.perform(get("/reports/summary")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }
}
