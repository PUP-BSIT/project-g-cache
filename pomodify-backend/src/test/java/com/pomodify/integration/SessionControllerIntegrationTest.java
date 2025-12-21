package com.pomodify.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pomodify.backend.presentation.dto.request.auth.LoginRequest;
import com.pomodify.backend.presentation.dto.request.auth.RegisterRequest;
import com.pomodify.backend.presentation.dto.request.session.SessionRequest;
import com.pomodify.backend.presentation.dto.request.category.CategoryRequest;
import com.pomodify.backend.presentation.dto.request.activity.CreateActivityRequest;
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
 * Integration tests for SessionController.
 * Tests session CRUD operations and state transitions (start, pause, resume, stop, etc.).
 * DISABLED: Requires Docker Desktop to be running. Tests can be enabled once Docker is available.
 */
@SpringBootTest(classes = com.pomodify.backend.PomodifyApiApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class SessionControllerIntegrationTest {

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

        private String accessToken;
        private Long activityId;

    @BeforeEach
    void setUp() throws Exception {
        // Register user
        RegisterRequest registerRequest = new RegisterRequest("John", "Doe", "john@example.com", "Password123!");
        mockMvc.perform(post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated());

        // Login and extract token
        LoginRequest loginRequest = new LoginRequest("john@example.com", "Password123!");
        MvcResult loginResult = mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andReturn();

        AuthResponse authResponse = objectMapper.readValue(
                loginResult.getResponse().getContentAsString(),
                AuthResponse.class
        );
        this.accessToken = authResponse.accessToken();
        // create a category
        CategoryRequest categoryRequest = new CategoryRequest("Default");
        MvcResult catResult = mockMvc.perform(post("/categories")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(categoryRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        Long categoryId = objectMapper.readTree(catResult.getResponse().getContentAsString())
                .get("categories").get(0).get("categoryId").asLong();

        // create an activity
        CreateActivityRequest activityRequest = CreateActivityRequest.builder()
                .title("Default Activity")
                .description("For tests")
                .categoryId(categoryId)
                .build();

        MvcResult actResult = mockMvc.perform(post("/activities")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(activityRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        this.activityId = objectMapper.readTree(actResult.getResponse().getContentAsString())
                .get("activities").get(0).get("activityId").asLong();
    }

    @Test
    void testCreateSession_Success() throws Exception {
        SessionRequest request = new SessionRequest("POMODORO", 25, 5, 4, false, 0, 0, false, 15, 180);

        mockMvc.perform(post("/activities/{activityId}/sessions", activityId)
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sessions[0].sessionType").value("POMODORO"))
                .andExpect(jsonPath("$.sessions[0].id").isNotEmpty());
    }

    @Test
    void testGetAllSessions() throws Exception {
        // Create a session first
        SessionRequest request = new SessionRequest("POMODORO", 25, 5, 4, false, 0, 0, false, 15, 180);
        mockMvc.perform(post("/activities/{activityId}/sessions", activityId)
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        // Get all sessions
        mockMvc.perform(get("/activities/{activityId}/sessions", activityId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessions").isArray())
                .andExpect(jsonPath("$.sessions[0].sessionType").value("POMODORO"));
    }

    @Test
    void testGetSessionById() throws Exception {
        // Create a session
        SessionRequest request = new SessionRequest("POMODORO", 25, 5, 4, false, 0, 0, false, 15, 180);
        MvcResult createResult = mockMvc.perform(post("/activities/{activityId}/sessions", activityId)
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        // Extract session ID from response
        String responseBody = createResult.getResponse().getContentAsString();
        String sessionId = objectMapper.readTree(responseBody).get("sessions").get(0).get("id").asText();

        // Get session by ID
        mockMvc.perform(get("/activities/{activityId}/sessions/{id}", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessions[0].id").value(Long.parseLong(sessionId)))
                .andExpect(jsonPath("$.sessions[0].sessionType").value("POMODORO"));
    }

    @Test
    void testStartSession() throws Exception {
        // Create a session
        SessionRequest request = new SessionRequest("POMODORO", 25, 5, 4, false, 0, 0, false, 15, 180);
        MvcResult createResult = mockMvc.perform(post("/activities/{activityId}/sessions", activityId)
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        String sessionId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("sessions").get(0).get("id").asText();

        // Start session
        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/start", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessions[0].status").exists());
    }

    @Test
    void testPauseSession() throws Exception {
        // Create and start a session
        SessionRequest request = new SessionRequest("POMODORO", 25, 5, 4, false, 0, 0, false, 15, 180);
        MvcResult createResult = mockMvc.perform(post("/activities/{activityId}/sessions", activityId)
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        String sessionId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("sessions").get(0).get("id").asText();

        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/start", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        // Pause session
        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/pause", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());
    }

    @Test
    void testUpdateSessionNote() throws Exception {
        // Create a session
        SessionRequest request = new SessionRequest("POMODORO", 25, 5, 4, false, 0, 0, false, 15, 180);
        MvcResult createResult = mockMvc.perform(post("/activities/{activityId}/sessions", activityId)
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        String sessionId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("sessions").get(0).get("id").asText();

        // Update session note using request param
        mockMvc.perform(put("/activities/{activityId}/sessions/{id}/note", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken)
                .param("note", "Updated note"))
                .andExpect(status().isOk());
    }

    @Test
    void testDeleteSession() throws Exception {
        // Create a session
        SessionRequest request = new SessionRequest("POMODORO", 25, 5, 4, false, 0, 0, false, 15, 180);
        MvcResult createResult = mockMvc.perform(post("/activities/{activityId}/sessions", activityId)
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        String sessionId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("sessions").get(0).get("id").asText();

        // Delete session
        mockMvc.perform(delete("/activities/{activityId}/sessions/{id}", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        // Verify session is deleted
        mockMvc.perform(get("/activities/{activityId}/sessions/{id}", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void testResumeSession() throws Exception {
        // Create and pause a session first
        SessionRequest request = new SessionRequest("POMODORO", 25, 5, 4, false, 0, 0, false, 15, 180);
        MvcResult createResult = mockMvc.perform(post("/activities/{activityId}/sessions", activityId)
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        String sessionId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("sessions").get(0).get("id").asText();

        // Start session
        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/start", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        // Pause session
        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/pause", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken)
                .param("note", "Taking a break"))
                .andExpect(status().isOk());

        // Resume session
        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/resume", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Session resumed successfully"));
    }

    @Test
    void testStopSession() throws Exception {
        // Create and start a session
        SessionRequest request = new SessionRequest("POMODORO", 25, 5, 4, false, 0, 0, false, 15, 180);
        MvcResult createResult = mockMvc.perform(post("/activities/{activityId}/sessions", activityId)
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        String sessionId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("sessions").get(0).get("id").asText();

        // Start session
        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/start", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        // Stop session (invalidates current cycle)
        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/stop", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken)
                .param("note", "Stopping for now"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Session stopped successfully (current cycle invalidated)"));
    }

    @Test
    void testCancelSession() throws Exception {
        // Create a session
        SessionRequest request = new SessionRequest("POMODORO", 25, 5, 4, false, 0, 0, false, 15, 180);
        MvcResult createResult = mockMvc.perform(post("/activities/{activityId}/sessions", activityId)
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        String sessionId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("sessions").get(0).get("id").asText();

        // Cancel session (invalidates all cycles)
        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/cancel", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Session canceled successfully (all cycles invalidated)"));
    }

    @Test
    void testFinishSession() throws Exception {
        // Create and start a session
        SessionRequest request = new SessionRequest("POMODORO", 25, 5, 4, false, 0, 0, false, 15, 180);
        MvcResult createResult = mockMvc.perform(post("/activities/{activityId}/sessions", activityId)
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        String sessionId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("sessions").get(0).get("id").asText();

        // Start session
        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/start", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        // Finish session
        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/finish", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken)
                .param("note", "Session completed"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Session finished successfully"));
    }

    @Test
    void testCompletePhase() throws Exception {
        // Create and start a session
        SessionRequest request = new SessionRequest("POMODORO", 25, 5, 4, false, 0, 0, false, 15, 180);
        MvcResult createResult = mockMvc.perform(post("/activities/{activityId}/sessions", activityId)
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        String sessionId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("sessions").get(0).get("id").asText();

        // Start session
        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/start", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        // Complete phase
        mockMvc.perform(post("/activities/{activityId}/sessions/{id}/complete-phase", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken)
                .param("note", "Phase completed"))
                .andExpect(status().isOk());
    }

    @Test
    void testSessionSSEEvents() throws Exception {
        // Create a session
        SessionRequest request = new SessionRequest("POMODORO", 25, 5, 4, false, 0, 0, false, 15, 180);
        MvcResult createResult = mockMvc.perform(post("/activities/{activityId}/sessions", activityId)
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        String sessionId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("sessions").get(0).get("id").asText();

        // Subscribe to SSE events
        mockMvc.perform(get("/activities/{activityId}/sessions/{id}/events", activityId, sessionId)
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());
                // Note: SSE connections can be verified by checking connection, timeout, and event streaming behavior
    }
}

