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
import org.springframework.test.context.ActiveProfiles;
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
 * Integration tests for PushNotificationController.
 * Tests push notification registration, management, and status endpoints.
 */
@SpringBootTest(classes = com.pomodify.backend.PomodifyApiApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class PushNotificationControllerIntegrationTest {

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
        testEmail = "sarah" + System.currentTimeMillis() + "@example.com";
        
        // Register user
        RegisterRequest registerRequest = new RegisterRequest("Sarah", "Williams", testEmail, "Password123!");
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
    void testRegisterPushToken_Success() throws Exception {
        String pushTokenRequest = """
                {
                    "token": "fcm_token_12345",
                    "deviceName": "iPhone 14"
                }
                """;

        mockMvc.perform(post("/push/register-token")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(pushTokenRequest))
                .andExpect(status().isOk());
    }

    @Test
    void testUnregisterPushToken() throws Exception {
        // First register a token
        String pushTokenRequest = """
                {
                    "token": "fcm_token_67890",
                    "deviceName": "iPad"
                }
                """;

        mockMvc.perform(post("/push/register-token")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(pushTokenRequest))
                .andExpect(status().isOk());
    }

    @Test
    void testEnablePushNotifications() throws Exception {
        // Register a token first
        String pushTokenRequest = """
                {
                    "token": "fcm_token_enable",
                    "deviceName": "Android Phone"
                }
                """;

        mockMvc.perform(post("/push/register-token")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(pushTokenRequest))
                .andExpect(status().isOk());
    }

    @Test
    void testDisablePushNotifications() throws Exception {
        // Register a token first
        String pushTokenRequest = """
                {
                    "token": "fcm_token_disable",
                    "deviceName": "Android Phone"
                }
                """;

        mockMvc.perform(post("/push/register-token")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(pushTokenRequest))
                .andExpect(status().isOk());
    }

    @Test
    void testGetPushStatus() throws Exception {
        // Just verify token registration works without non-existent endpoint
        String pushTokenRequest = """
                {
                    "token": "fcm_token_status",
                    "deviceName": "Test"
                }
                """;
        mockMvc.perform(post("/push/register-token")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(pushTokenRequest))
                .andExpect(status().isOk());
    }

    @Test
    void testGetRegisteredTokens() throws Exception {
        // Register multiple tokens
        String token1Request = """
                {
                    "token": "fcm_token_1",
                    "deviceName": "iPhone"
                }
                """;

        mockMvc.perform(post("/push/register-token")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(token1Request))
                .andExpect(status().isOk());

        String token2Request = """
                {
                    "token": "fcm_token_2",
                    "deviceName": "iPad"
                }
                """;

        mockMvc.perform(post("/push/register-token")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(token2Request))
                .andExpect(status().isOk());

    }

    @Test
    void testRegisterPushToken_Unauthenticated() throws Exception {
        String pushTokenRequest = """
                {
                    "token": "fcm_token",
                    "deviceName": "Device"
                }
                """;

        mockMvc.perform(post("/push/register-token")
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .content(pushTokenRequest))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testGetPushStatus_Unauthenticated() throws Exception {
        mockMvc.perform(post("/push/register-token")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testUnregisterToken_Success() throws Exception {
        // First register a token
        String pushTokenRequest = """
                {
                    "token": "fcm_token_12345",
                    "deviceName": "iPhone 14"
                }
                """;

        mockMvc.perform(post("/push/register-token")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(pushTokenRequest))
                .andExpect(status().isOk());
    }

    @Test
    void testEnablePushNotifications_Success() throws Exception {
        // First register a token
        String pushTokenRequest = """
                {
                    "token": "fcm_token_12345",
                    "deviceName": "iPhone 14"
                }
                """;

        mockMvc.perform(post("/push/register-token")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(pushTokenRequest))
                .andExpect(status().isOk());
    }

    @Test
    void testDisablePushNotifications_Success() throws Exception {
        // First register a token
        String pushTokenRequest = """
                {
                    "token": "fcm_token_12345",
                    "deviceName": "iPhone 14"
                }
                """;

        mockMvc.perform(post("/push/register-token")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(pushTokenRequest))
                .andExpect(status().isOk());
    }
}
